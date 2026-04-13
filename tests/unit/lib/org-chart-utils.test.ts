import { describe, it, expect } from "vitest";
import { transformToOrgChart, EmployeeOrgChartData } from "../../../src/lib/org-chart-utils";

describe("org-chart-utils", () => {
  it("should transform employees to nodes and edges", () => {
    const employees: EmployeeOrgChartData[] = [
      {
        id: "1",
        firstName: "CEO",
        lastName: "Boss",
        workInfo: JSON.stringify({ jobTitle: "Chief Executive Officer" }),
        managerId: null,
      },
      {
        id: "2",
        firstName: "Manager",
        lastName: "One",
        workInfo: JSON.stringify({ jobTitle: "Engineering Manager" }),
        managerId: "1",
      },
      {
        id: "3",
        firstName: "Employee",
        lastName: "One",
        workInfo: JSON.stringify({ jobTitle: "Software Engineer" }),
        managerId: "2",
      },
    ];

    const result = transformToOrgChart(employees);

    expect(result.nodes).toHaveLength(3);
    expect(result.edges).toHaveLength(2);

    expect(result.nodes[0].data.jobTitle).toBe("Chief Executive Officer");
    expect(result.nodes[1].data.jobTitle).toBe("Engineering Manager");
    expect(result.nodes[2].data.jobTitle).toBe("Software Engineer");

    expect(result.edges[0].source).toBe("1");
    expect(result.edges[0].target).toBe("2");
    expect(result.edges[1].source).toBe("2");
    expect(result.edges[1].target).toBe("3");
  });

  it("should calculate positions for nodes", () => {
    const employees: EmployeeOrgChartData[] = [
      {
        id: "1",
        firstName: "CEO",
        lastName: "Boss",
        workInfo: JSON.stringify({ jobTitle: "CEO" }),
        managerId: null,
      },
      {
        id: "2",
        firstName: "M1",
        lastName: "One",
        workInfo: JSON.stringify({ jobTitle: "M1" }),
        managerId: "1",
      },
    ];

    const result = transformToOrgChart(employees);

    expect(result.nodes[0].position.y).toBeLessThan(result.nodes[1].position.y);
  });

  it("should handle invalid workInfo gracefully", () => {
    const employees: EmployeeOrgChartData[] = [
      {
        id: "1",
        firstName: "CEO",
        lastName: "Boss",
        workInfo: "invalid-json",
        managerId: null,
      },
      {
        id: "2",
        firstName: "Emp",
        lastName: "Two",
        workInfo: null,
        managerId: "1",
      },
      {
        id: "3",
        firstName: "Emp",
        lastName: "Three",
        workInfo: { jobTitle: "Direct Object" },
        managerId: "1",
      },
    ];

    const result = transformToOrgChart(employees);
    expect(result.nodes[0].data.jobTitle).toBe("");
    expect(result.nodes[1].data.jobTitle).toBe("");
    expect(result.nodes[2].data.jobTitle).toBe("Direct Object");
  });
});
