"use client";
import ReactFlow, { Background, Controls, MiniMap } from "reactflow";
import "reactflow/dist/style.css";
import { trpc } from "@/lib/trpc";
import { transformToOrgChart } from "@/lib/org-chart-utils";
import { EmployeeNode } from "@/components/org-chart/employee-node";
import { useMemo } from "react";

const nodeTypes = {
  employeeNode: EmployeeNode,
};

export default function OrgChartPage() {
  const { data: employees, isLoading } = trpc.employee.getOrgChartData.useQuery();

  const { nodes, edges } = useMemo(() => {
    if (!employees) return { nodes: [], edges: [] };
    return transformToOrgChart(employees);
  }, [employees]);

  if (isLoading) return <div>Loading Org Chart...</div>;

  return (
    <div className="h-[calc(100vh-160px)] border rounded-xl bg-gray-50 dark:bg-charcoal-900 border-gray-200 dark:border-charcoal-700 overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap nodeColor="#E33054" />
      </ReactFlow>
    </div>
  );
}
