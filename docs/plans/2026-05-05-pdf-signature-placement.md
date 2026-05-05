# Interactive PDF Signature Placement

## Overview

Add interactive PDF signature placement to the existing e-signature system. Currently, signatures are stamped at a fixed default position (centered, bottom quarter of the last page). This enhancement lets the admin **pre-mark exact signature spots** on a PDF when requesting a signature, and the employee **sees and signs at those pre-marked positions**. The PDF is rendered in-browser using `pdfjs-dist`, placements are stored in the database, and the server stamps signatures at the specified coordinates.

## Current State

The self-owned e-signature system (built in the previous iteration, see `2026-05-04-replace-docusign-esign.md`) already provides:

| Component | File | What it does |
|---|---|---|
| Signature stamper | `src/lib/signature-stamper.ts` | Server-side PDF stamping via `pdf-lib`. Accepts a single `StampOptions` with optional `pageIndex`, `x`, `y`, `width`. Defaults: last page, centered, bottom quarter. |
| Signature router | `src/server/routers/signature.ts` | tRPC procedures: `requestSignature`, `sign`, `decline`, `getPending`, `getByDocument`, `getSignedPdf`. |
| Signature dialog | `src/components/documents/signature-dialog.tsx` | Modal for the signer: capture signature (draw/type), confirm, decline. No PDF preview -- signer signs blindly. |
| Signature pad | `src/components/documents/signature-pad.tsx` | Canvas draw mode + typed-name mode. Outputs PNG data URL. |
| Documents page | `src/app/(dashboard)/documents/page.tsx` | Lists documents, pending signatures, "Send for Signature" dialog (employee picker). |
| People page | `src/app/(dashboard)/people/[id]/page.tsx` | Compensation History pen icon triggers signature request. Inline signing modal with `SignaturePad`. |
| SignatureRecord model | `prisma/schema.prisma` (line 867) | Tracks documentId, signerId, status, signatureImage, signedPdfPath. No placement coordinates. |
| Document model | `prisma/schema.prisma` (line 448) | Has `signatureStatus`, `filePath`, relation to `SignatureRecord[]`. |

### Key limitations being addressed

1. **No PDF preview** -- the signer never sees the document before signing.
2. **No placement control** -- HR cannot specify where signatures should land on the PDF.
3. **Single placement only** -- `stampSignature()` stamps once; multi-spot signing (e.g., initial each page + full signature on last page) is not possible.

## What Will Be Built

### 1. PDF Viewer Component (`src/components/documents/pdf-viewer.tsx`)

A reusable React component that renders PDF pages in-browser using `pdfjs-dist`.

**Props:**
```ts
interface PdfViewerProps {
  /** URL to fetch the PDF (e.g., /api/files/download?path=...) */
  pdfUrl: string;
  /** Signature placements to render as overlays */
  placements?: SignaturePlacement[];
  /** Called when user clicks on the PDF to add a placement (admin mode) */
  onPlacementAdd?: (placement: SignaturePlacement) => void;
  /** Called when user drags/resizes an existing placement */
  onPlacementUpdate?: (index: number, placement: SignaturePlacement) => void;
  /** Called when user removes a placement */
  onPlacementRemove?: (index: number) => void;
  /** If true, placements are interactive (draggable, removable). If false, read-only overlays. */
  editable?: boolean;
  /** Optional: render a signature image inside each placement (signer view) */
  signatureImageUrl?: string;
}
```

**Behavior:**
- Loads the PDF via `pdfjs-dist`'s `getDocument()` and renders each page to a `<canvas>`.
- Pages scroll vertically. Each page canvas is wrapped in a relatively-positioned container.
- Placements are rendered as absolutely-positioned overlays on top of the canvas, using percentage-based or point-based coordinates relative to the page dimensions.
- In **admin/edit mode** (`editable=true`): clicking on a page adds a new placement box at that position. Existing placements can be dragged to reposition and removed via an X button.
- In **signer/read-only mode** (`editable=false`): placements are shown as highlighted regions with a "Sign Here" indicator. The signer's captured signature image is previewed inside each placement.
- The component reports coordinates in **PDF points** (matching the coordinate system used by `pdf-lib` for stamping), so no coordinate translation is needed on the server.

**`pdfjs-dist` worker setup:**
- Copy the worker file to `public/pdf.worker.min.mjs` or configure the worker source via `pdfjs.GlobalWorkerOptions.workerSrc`.
- For Next.js, set the worker source to the CDN URL matching the installed `pdfjs-dist` version, or use a webpack copy plugin to serve the worker from `/public/`.

### 2. SignaturePlacement Type

A shared type definition used across client and server:

```ts
interface SignaturePlacement {
  /** Zero-based page index */
  pageIndex: number;
  /** X coordinate in PDF points (from left edge of page) */
  x: number;
  /** Y coordinate in PDF points (from bottom edge of page, matching pdf-lib convention) */
  y: number;
  /** Width of the signature box in PDF points */
  width: number;
  /** Height of the signature box in PDF points */
  height: number;
  /** Optional label (e.g., "Initial", "Full Signature") */
  label?: string;
}
```

Place this in `src/types/signature.ts` (new file) so it can be imported by both client components and server code.

**Coordinate convention:** `pdfjs-dist` uses a top-left origin for rendering, while `pdf-lib` uses a bottom-left origin for drawing. The `PdfViewer` component must translate between these two systems:
- When the admin clicks on the canvas at pixel `(px, py)`, convert to PDF points using the render scale, then flip the Y axis: `pdfY = pageHeight - canvasY_in_points`.
- Store coordinates in `pdf-lib` convention (bottom-left origin) so the server can use them directly without conversion.

### 3. Admin Placement Flow -- Updated "Send for Signature"

Currently, the "Send for Signature" dialog (`documents/page.tsx` lines 203-244 and `people/[id]/page.tsx` lines 1525-1551) opens a simple employee picker and immediately sends the request. This will be replaced with a two-step flow:

**Step 1: Select Signer** (existing behavior, no change)
- Admin picks the target employee from a dropdown.

**Step 2: Mark Signature Spots** (new)
- The dialog expands to show the `PdfViewer` in edit mode, rendering the document's PDF.
- Admin clicks on the PDF to place signature markers. Multiple placements are allowed (e.g., initials on page 1, full signature on page 3).
- Each placement shows as a dashed blue rectangle with an X button to remove.
- Placements can be dragged to reposition.
- A "Send" button finalizes the request, passing the placements array alongside `documentId` and `signerId`.

**UI location:** This flow will be implemented as a new component `src/components/documents/placement-dialog.tsx` that wraps the `PdfViewer` and the employee picker. It replaces the inline `<Dialog>` in `documents/page.tsx` and the pen-icon click handler in `people/[id]/page.tsx`.

### 4. Signer View -- Updated Signature Dialog

Currently, `signature-dialog.tsx` shows document info text and a `SignaturePad` with no PDF preview. This will be updated:

**New flow:**
1. The dialog opens full-width (or near full-width) to accommodate the PDF viewer.
2. The `PdfViewer` renders the document in read-only mode with the pre-marked placements shown as highlighted "Sign Here" regions.
3. Below or beside the PDF viewer, the `SignaturePad` (draw/type) captures the signature.
4. As the signer draws/types, a live preview of their signature image appears inside each placement on the PDF.
5. The "Sign Document" button submits the signature. No placement data is sent from the signer -- the placements are already stored in the `SignatureRecord` from step 3.

### 5. Schema Changes

#### SignatureRecord -- add `placements` column

```prisma
model SignatureRecord {
  // ... existing fields ...
  placements      String?   // JSON string: SignaturePlacement[] -- null for legacy records
  // ... existing relations ...
}
```

Using a `String?` column for JSON storage (SQLite-compatible). The field stores a `JSON.stringify()`'d array of `SignaturePlacement` objects. Null means "use legacy default placement" (centered, bottom quarter of last page), preserving backward compatibility with existing records.

**No migration needed for SQLite** -- `prisma db push` will add the nullable column with a null default.

### 6. Server Changes

#### `signature-stamper.ts` -- support multiple placements

Update `stampSignature()` to accept an optional array of placements. If provided, stamp the signature at each placement position. If not provided, fall back to the existing single-stamp behavior.

**Updated interface:**

```ts
export interface StampOptions {
  /** Legacy single-placement fields (kept for backward compat) */
  pageIndex?: number;
  x?: number;
  y?: number;
  width?: number;
  signerName: string;
  signedAt: Date;
  /** New: array of placements. If provided, overrides pageIndex/x/y/width. */
  placements?: SignaturePlacement[];
}
```

**Updated logic:**
- If `options.placements` is provided and non-empty, loop over each placement and stamp the signature image at each position (page, x, y, width). Draw the annotation text only once (below the last placement on its page).
- If `options.placements` is not provided, use the existing single-stamp logic (no behavior change for existing callers).

#### `signature.ts` router -- pass placements through

**`requestSignature` mutation:**
- Add an optional `placements` field to the input schema: `placements: z.string().optional()` (JSON string).
- Validate that it parses as a valid `SignaturePlacement[]` if provided.
- Store in the `SignatureRecord.placements` column.

**`sign` mutation:**
- Read `record.placements` from the database.
- Parse the JSON string into `SignaturePlacement[]`.
- Pass the placements array to `stampSignature()` via the `placements` option.
- If `record.placements` is null (legacy record), the existing default behavior applies.

**`getPending` / `getByDocument` queries:**
- Include `placements` in the returned data so the client can render them in the PDF viewer.

### 7. PDF URL Resolution

The `PdfViewer` needs a URL to fetch the PDF. The existing storage system provides:
- **Local storage:** `GET /api/files/download?path={filePath}` returns the file contents.
- **S3 storage:** `storageProvider.getDownloadUrl(filePath)` returns a presigned URL.

Add a new tRPC query `signature.getPdfUrl` that, given a `signatureRecordId`, resolves the associated document's file path to a download URL via `storageProvider.getDownloadUrl()`. This avoids exposing raw file paths to the client.

```ts
getPdfUrl: protectedProcedure
  .input(z.object({ signatureRecordId: z.string() }))
  .query(async ({ ctx, input }) => {
    const record = await ctx.db.signatureRecord.findFirst({
      where: { id: input.signatureRecordId, companyId: ctx.user.companyId },
      include: { document: true },
    });
    if (!record?.document.filePath) throw new TRPCError({ code: 'NOT_FOUND' });
    const url = await storageProvider.getDownloadUrl(record.document.filePath);
    return { url };
  }),
```

For the admin placement flow (before a `SignatureRecord` exists), add a similar query on the `document` router:

```ts
getDocumentPdfUrl: protectedProcedure
  .input(z.object({ documentId: z.string() }))
  .query(async ({ ctx, input }) => {
    const doc = await ctx.db.document.findFirst({
      where: { id: input.documentId, companyId: ctx.user.companyId },
    });
    if (!doc?.filePath) throw new TRPCError({ code: 'NOT_FOUND' });
    const url = await storageProvider.getDownloadUrl(doc.filePath);
    return { url };
  }),
```

## Files to Create

| File | Purpose |
|---|---|
| `src/types/signature.ts` | `SignaturePlacement` type definition shared by client and server |
| `src/components/documents/pdf-viewer.tsx` | PDF rendering component using `pdfjs-dist` with placement overlays |
| `src/components/documents/placement-dialog.tsx` | Admin dialog: employee picker + PDF viewer in edit mode for marking signature spots |

## Files to Modify

| File | Changes |
|---|---|
| `prisma/schema.prisma` | Add `placements String?` to `SignatureRecord` model |
| `src/lib/signature-stamper.ts` | Accept optional `placements: SignaturePlacement[]` in `StampOptions`. Loop and stamp at each placement. Fall back to single-stamp if not provided. |
| `src/server/routers/signature.ts` | Add `placements` to `requestSignature` input, store in DB. Read and pass placements in `sign` mutation. Add `getPdfUrl` query. Include `placements` in query results. |
| `src/server/routers/document.ts` | Add `getDocumentPdfUrl` query for admin to fetch PDF URL before creating a signature record. |
| `src/components/documents/signature-dialog.tsx` | Expand to show `PdfViewer` in read-only mode with placements. Show live signature preview in placement regions. |
| `src/app/(dashboard)/documents/page.tsx` | Replace inline "Send for Signature" dialog with `PlacementDialog`. |
| `src/app/(dashboard)/people/[id]/page.tsx` | Update pen-icon click handler to open `PlacementDialog` instead of directly calling `requestSignature.mutate()`. |
| `package.json` | Add `pdfjs-dist` dependency. |
| `next.config.js` or `next.config.mjs` | Add webpack config to handle `pdfjs-dist` worker file (copy to public or configure canvas/worker). |

## Implementation Order

### Task 1: Add `pdfjs-dist` dependency and shared types

- `npm install pdfjs-dist`
- Create `src/types/signature.ts` with `SignaturePlacement` interface
- Configure `pdfjs-dist` worker for Next.js (webpack copy plugin or CDN worker source in `next.config`)
- Verify the worker loads without errors in dev mode

### Task 2: Build `PdfViewer` component

- Create `src/components/documents/pdf-viewer.tsx`
- Render PDF pages to canvases using `pdfjs-dist`
- Support vertical scrolling through pages
- Accept and render `placements` as overlays
- In edit mode: click-to-place, drag-to-reposition, X-to-remove
- In read-only mode: show highlighted "Sign Here" regions
- Handle coordinate translation between canvas pixels and PDF points (top-left vs bottom-left origin)
- Handle DPI scaling for sharp rendering on Retina displays

### Task 3: Schema and server changes

- Add `placements String?` to `SignatureRecord` in `prisma/schema.prisma`
- Run `prisma db push`
- Update `signature-stamper.ts` to accept and loop over `placements[]`
- Update `requestSignature` mutation to accept and store `placements` JSON
- Update `sign` mutation to parse and pass placements to `stampSignature()`
- Add `getPdfUrl` query to signature router
- Add `getDocumentPdfUrl` query to document router

### Task 4: Build `PlacementDialog` component (admin flow)

- Create `src/components/documents/placement-dialog.tsx`
- Two-step flow: employee picker, then PDF viewer in edit mode
- Admin clicks on pages to mark signature spots
- Send button calls `requestSignature` with placements JSON
- Integrate into `documents/page.tsx` (replace inline dialog)
- Integrate into `people/[id]/page.tsx` (replace direct `requestSignature.mutate()` call)

### Task 5: Update `SignatureDialog` (signer flow)

- Update `signature-dialog.tsx` to show `PdfViewer` in read-only mode
- Fetch PDF URL via new `getPdfUrl` query
- Parse and pass `placements` from the `SignatureRecord` to `PdfViewer`
- Show live preview of captured signature inside each placement region
- Maintain existing sign/decline functionality

### Task 6: Testing and polish

- Test with multi-page PDFs: placements on different pages
- Test with legacy records (null placements): verify fallback to default position
- Test coordinate accuracy: signature should land exactly where the admin placed it
- Test mobile responsiveness of PDF viewer
- Test with large PDFs (many pages): verify performance and memory
- Full build (`npm run build`) to verify no broken imports
- Run all tests (`npm run test`) to verify no regressions

## Coordinate System Detail

This is the trickiest part of the implementation. Getting it wrong means signatures land in the wrong spot.

**`pdfjs-dist` rendering coordinates:**
- Origin: top-left of the page
- Y increases downward
- Units: CSS pixels (scaled by viewport transform)

**`pdf-lib` stamping coordinates:**
- Origin: bottom-left of the page
- Y increases upward
- Units: PDF points (1 point = 1/72 inch)

**Translation formula (in the PdfViewer component):**
```
// Admin clicks at pixel position (clickX, clickY) on a canvas rendered at `scale`
const pdfX = clickX / scale;
const pdfY_from_top = clickY / scale;
const pdfY = pageHeightInPoints - pdfY_from_top - placementHeightInPoints;
```

Store `pdfX` and `pdfY` (bottom-left origin) in the `SignaturePlacement`. The server uses these directly with `pdf-lib`'s `page.drawImage({ x, y })`.

**Rendering back in the viewer (signer view):**
```
// Convert stored placement back to canvas coordinates for overlay positioning
const canvasX = placement.x * scale;
const canvasY_from_top = (pageHeightInPoints - placement.y - placement.height) * scale;
```

## Non-Goals (Out of Scope)

- **Placement templates** -- saving and reusing placement presets for document types. Future enhancement.
- **Per-placement signer assignment** -- all placements are for the same signer. Multi-signer with different placements per signer is a future enhancement.
- **Signature field types** -- all placements are for the same signature image. Differentiating "initial" vs "full signature" with different captured images is a future enhancement.
- **PDF form field detection** -- automatically detecting existing signature fields in the PDF. All placement is manual.
- **PDF text selection or annotation** -- the viewer is render-only. No text layer or annotation support.

## Dependencies

| Dependency | Version | License | Why |
|---|---|---|---|
| `pdfjs-dist` | ^4.x | Apache-2.0 | Render PDF pages in the browser using canvas. Required for the placement UI. |

`pdf-lib` (already installed) continues to handle server-side stamping.
