"use client";
import React, { useState, useMemo, useCallback } from "react";
import ReactFlow, { Background, Controls, MiniMap, useReactFlow, ReactFlowProvider } from "reactflow";
import "reactflow/dist/style.css";
import { trpc } from "@/lib/trpc";
import { transformToOrgChart } from "@/lib/org-chart-utils";
import { EmployeeNode, DEPT_COLORS, DEFAULT_COLORS } from "@/components/org-chart/employee-node";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";

const nodeTypes = { employeeNode: EmployeeNode };

function OrgChartInner() {
  const { data: employees, isLoading } = trpc.employee.getOrgChartData.useQuery();
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const { setCenter } = useReactFlow();

  const { nodes: allNodes, edges: allEdges } = useMemo(() => {
    if (!employees) return { nodes: [], edges: [] };
    return transformToOrgChart(employees);
  }, [employees]);

  const departments = useMemo(() => {
    if (!employees) return [];
    const depts = new Set<string>();
    (employees as any[]).forEach(e => { if (e.department?.name) depts.add(e.department.name); });
    return Array.from(depts).sort();
  }, [employees]);

  const { nodes, edges } = useMemo(() => {
    if (!deptFilter) return { nodes: allNodes, edges: allEdges };
    const visibleIds = new Set(allNodes.filter(n => (n.data as any).department?.name === deptFilter).map(n => n.id));
    const empMap = new Map((employees as any[] || []).map((e: any) => [e.id, e]));
    for (const id of [...visibleIds]) {
      let current = empMap.get(id);
      while (current?.managerId && !visibleIds.has(current.managerId)) {
        visibleIds.add(current.managerId);
        current = empMap.get(current.managerId);
      }
    }
    return {
      nodes: allNodes.filter(n => visibleIds.has(n.id)),
      edges: allEdges.filter(e => visibleIds.has(e.source) && visibleIds.has(e.target)),
    };
  }, [allNodes, allEdges, deptFilter, employees]);

  const searchMatches = useMemo(() => {
    if (!search.trim() || !employees) return [];
    const q = search.toLowerCase();
    return (employees as any[]).filter(e =>
      `${e.firstName} ${e.lastName}`.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [search, employees]);

  const zoomToPerson = useCallback((empId: string) => {
    const node = nodes.find(n => n.id === empId);
    if (node) {
      setCenter(node.position.x + 110, node.position.y + 30, { zoom: 1.5, duration: 800 });
    }
    setSearch("");
  }, [nodes, setCenter]);

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-160px)] flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading Org Chart...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold">Org Chart</h1>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employee..." className="pl-9 w-56" />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            )}
            {searchMatches.length > 0 && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setSearch("")} />
                <div className="absolute left-0 top-full mt-1 z-20 bg-white dark:bg-charcoal-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl py-1 w-full max-h-[240px] overflow-y-auto">
                  {searchMatches.map((emp: any) => {
                    const deptName = emp.department?.name || '';
                    const colors = DEPT_COLORS[deptName] || DEFAULT_COLORS;
                    return (
                      <button key={emp.id} onClick={() => { zoomToPerson(emp.id); setDeptFilter(""); }}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: colors.dot }} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{emp.firstName} {emp.lastName}</p>
                          {deptName && <p className="text-[10px] text-gray-400">{deptName}</p>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Department filter pills */}
          <div className="flex gap-1.5 flex-wrap">
            <button onClick={() => setDeptFilter("")}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${!deptFilter ? 'bg-gray-800 text-white dark:bg-white dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'}`}>
              All
            </button>
            {departments.map(dept => {
              const colors = DEPT_COLORS[dept] || DEFAULT_COLORS;
              return (
                <button key={dept} onClick={() => setDeptFilter(deptFilter === dept ? "" : dept)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 ${deptFilter === dept ? 'bg-gray-800 text-white dark:bg-white dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'}`}>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.dot }} />
                  {dept}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="h-[calc(100vh-220px)] border rounded-xl bg-gray-50 dark:bg-charcoal-900 border-gray-200 dark:border-charcoal-700 overflow-hidden">
        <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView minZoom={0.1} maxZoom={2}>
          <Background />
          <Controls />
          <MiniMap
            nodeColor={(node) => {
              const dept = (node.data as any)?.department?.name;
              return (DEPT_COLORS[dept] || DEFAULT_COLORS).dot;
            }}
            maskColor="rgba(0,0,0,0.1)"
          />
        </ReactFlow>
      </div>
    </div>
  );
}

export default function OrgChartPage() {
  return (
    <ReactFlowProvider>
      <OrgChartInner />
    </ReactFlowProvider>
  );
}
