import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc';
import { notifyService } from '@/lib/notify-service';
import { stampSignature } from '@/lib/signature-stamper';
import { storage as storageProvider } from '@/lib/storage';
import fs from 'fs/promises';
import path from 'path';

export const signatureRouter = router({
  /**
   * HR sends a document to an employee for signing.
   * Creates a SignatureRecord with status PENDING and updates Document.signatureStatus.
   */
  requestSignature: protectedProcedure
    .input(
      z.object({
        documentId: z.string(),
        signerId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const doc = await ctx.db.document.findFirst({
        where: { id: input.documentId, companyId: ctx.user.companyId },
      });
      if (!doc) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Document not found' });
      }

      const signer = await ctx.db.employee.findFirst({
        where: { id: input.signerId, companyId: ctx.user.companyId },
      });
      if (!signer) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Signer employee not found' });
      }

      const record = await ctx.db.signatureRecord.create({
        data: {
          documentId: doc.id,
          signerId: signer.id,
          signerName: `${signer.firstName} ${signer.lastName}`,
          signerEmail: signer.email,
          status: 'PENDING',
          requestedBy: ctx.user.employeeId!,
          companyId: ctx.user.companyId,
        },
      });

      await ctx.db.document.update({
        where: { id: doc.id },
        data: { signatureStatus: 'PENDING_SIGNATURE' },
      });

      // Notify the signer
      await notifyService.send({
        companyId: ctx.user.companyId,
        recipients: [signer.id],
        eventType: 'DOCUMENT_PENDING_SIGNATURE',
        title: `Document "${doc.name}" requires your signature`,
        message: 'Please review and sign the document.',
        linkUrl: '/documents',
      });

      return record;
    }),

  /**
   * Signer submits their signature image.
   * Stamps the PDF, saves the signed copy, updates records.
   */
  sign: protectedProcedure
    .input(
      z.object({
        signatureRecordId: z.string(),
        signatureImageBase64: z.string().max(500_000, 'Signature image exceeds maximum size'),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const record = await ctx.db.signatureRecord.findFirst({
        where: {
          id: input.signatureRecordId,
          signerId: ctx.user.employeeId!,
          companyId: ctx.user.companyId,
          status: 'PENDING',
        },
        include: { document: true },
      });
      if (!record) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Signature request not found or already processed',
        });
      }

      const now = new Date();

      // Decode the signature image from base64
      const sigMatch = input.signatureImageBase64.match(
        /^data:image\/png;base64,(.+)$/,
      );
      const sigBase64 = sigMatch ? sigMatch[1] : input.signatureImageBase64;
      const signatureImageBytes = Buffer.from(sigBase64, 'base64');

      // Save signature image to storage
      const sigKey = await storageProvider.uploadFile(
        signatureImageBytes,
        `signature-${record.id}.png`,
        'signatures',
      );

      // Try to stamp the PDF
      let signedPdfKey: string | null = null;
      if (record.document.filePath) {
        try {
          const uploadDir = path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads'));
          const pdfFullPath = path.resolve(uploadDir, record.document.filePath);
          // Path traversal guard — ensure resolved path stays inside upload directory
          const relative = path.relative(uploadDir, pdfFullPath);
          if (relative.startsWith('..') || path.isAbsolute(relative)) {
            throw new Error('Path traversal attempt detected');
          }
          const pdfBytes = await fs.readFile(pdfFullPath);

          const stampedBytes = await stampSignature(
            new Uint8Array(pdfBytes),
            new Uint8Array(signatureImageBytes),
            {
              signerName: record.signerName,
              signedAt: now,
            },
          );

          // Save the signed PDF
          const originalName = record.document.name.replace(/\.pdf$/i, '');
          signedPdfKey = await storageProvider.uploadFile(
            Buffer.from(stampedBytes),
            `${originalName}.signed.pdf`,
            'contracts',
          );
        } catch (err) {
          // Non-blocking: signature is recorded even if PDF stamping fails
          console.error('[signature] PDF stamping failed:', err);
        }
      }

      // Update the signature record
      const updated = await ctx.db.signatureRecord.update({
        where: { id: record.id },
        data: {
          status: 'SIGNED',
          signatureImage: sigKey,
          signedPdfPath: signedPdfKey,
          signedAt: now,
        },
      });

      // Update document status
      await ctx.db.document.update({
        where: { id: record.documentId },
        data: { signatureStatus: 'SIGNED' },
      });

      // Notify the requester
      await notifyService.send({
        companyId: ctx.user.companyId,
        recipients: [record.requestedBy],
        eventType: 'DOCUMENT_SIGNED',
        title: `Document "${record.document.name}" has been signed`,
        message: `${record.signerName} has signed the document.`,
        linkUrl: '/documents',
      });

      return updated;
    }),

  /**
   * Signer declines to sign.
   */
  decline: protectedProcedure
    .input(
      z.object({
        signatureRecordId: z.string(),
        reason: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const record = await ctx.db.signatureRecord.findFirst({
        where: {
          id: input.signatureRecordId,
          signerId: ctx.user.employeeId!,
          companyId: ctx.user.companyId,
          status: 'PENDING',
        },
        include: { document: true },
      });
      if (!record) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Signature request not found or already processed',
        });
      }

      const updated = await ctx.db.signatureRecord.update({
        where: { id: record.id },
        data: {
          status: 'DECLINED',
          declinedAt: new Date(),
          declineReason: input.reason || null,
        },
      });

      await ctx.db.document.update({
        where: { id: record.documentId },
        data: { signatureStatus: 'DECLINED' },
      });

      // Notify the requester
      await notifyService.send({
        companyId: ctx.user.companyId,
        recipients: [record.requestedBy],
        eventType: 'DOCUMENT_DECLINED',
        title: `Document "${record.document.name}" was declined`,
        message: `${record.signerName} declined to sign.${input.reason ? ` Reason: ${input.reason}` : ''}`,
        linkUrl: '/documents',
      });

      return updated;
    }),

  /**
   * Get all pending signature requests for the current user.
   */
  getPending: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.signatureRecord.findMany({
      where: {
        signerId: ctx.user.employeeId!,
        companyId: ctx.user.companyId,
        status: 'PENDING',
      },
      include: {
        document: true,
        requester: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { requestedAt: 'desc' },
    });
  }),

  /**
   * Get all signature records for a given document.
   */
  getByDocument: protectedProcedure
    .input(z.object({ documentId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.signatureRecord.findMany({
        where: {
          documentId: input.documentId,
          companyId: ctx.user.companyId,
        },
        include: {
          signer: { select: { firstName: true, lastName: true, email: true } },
          requester: { select: { firstName: true, lastName: true, email: true } },
        },
        orderBy: { requestedAt: 'desc' },
      });
    }),

  /**
   * Get download URL for a signed PDF.
   */
  getSignedPdf: protectedProcedure
    .input(z.object({ signatureRecordId: z.string() }))
    .query(async ({ ctx, input }) => {
      const record = await ctx.db.signatureRecord.findFirst({
        where: {
          id: input.signatureRecordId,
          companyId: ctx.user.companyId,
          status: 'SIGNED',
        },
      });
      if (!record || !record.signedPdfPath) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Signed PDF not found',
        });
      }

      const url = await storageProvider.getDownloadUrl(record.signedPdfPath);
      return { url };
    }),
});
