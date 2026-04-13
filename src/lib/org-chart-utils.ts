// src/lib/org-chart-utils.ts
import dagre from "dagre";
import { Node, Edge, Position } from "reactflow";

const nodeWidth = 220;
const nodeHeight = 60;

export interface EmployeeOrgChartData {
  id: string;
  firstName: string;
  lastName: string;
  workInfo?: string | { jobTitle?: string } | null;
  managerId?: string | null;
  [key: string]: any;
}

export function getLayoutedElements(nodes: Node[], edges: Edge[], direction = "TB"): { nodes: Node[], edges: Edge[] } {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    
    return {
      ...node,
      targetPosition: Position.Top,
      sourcePosition: Position.Bottom,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}

export function transformToOrgChart(employees: EmployeeOrgChartData[]): { nodes: Node[], edges: Edge[] } {
  const nodes: Node[] = employees.map((emp) => {
    let jobTitle = "";
    
    if (emp.workInfo) {
      if (typeof emp.workInfo === 'string') {
        try {
          const parsed = JSON.parse(emp.workInfo);
          jobTitle = parsed.jobTitle || "";
        } catch (e) {
          // If it's a string but not JSON, maybe it's just the job title or something else
          // In the current implementation it tries to fallback to object check
        }
      } else if (typeof emp.workInfo === 'object') {
        jobTitle = emp.workInfo.jobTitle || "";
      }
    }

    return {
      id: emp.id,
      type: "employeeNode",
      data: {
        ...emp,
        jobTitle,
        directReportsCount: (emp as any)._count?.directReports ?? 0,
      },
      position: { x: 0, y: 0 },
    };
  });

  const edges: Edge[] = employees
    .filter((emp) => emp.managerId)
    .map((emp) => ({
      id: `e-${emp.managerId}-${emp.id}`,
      source: emp.managerId!,
      target: emp.id,
      type: "smoothstep",
      animated: true,
      style: { stroke: "#E33054" },
    }));

  return getLayoutedElements(nodes, edges);
}
