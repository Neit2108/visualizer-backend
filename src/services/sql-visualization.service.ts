// ==========================================
// SQL Visualization Service
// Business logic for visualizing SQL query execution
// ==========================================

import type { PoolConnection } from 'mysql2/promise';
import type {
  ExecutionStep,
  DataFlowStep,
  RowState,
  QueryVisualization,
  TableData,
  ParsedSelectQuery,
} from '../types/index.js';
import { SQLParserService } from './sql-parser.service.js';
import { SQLRepository } from '../repositories/sql.repository.js';
import { SQLExecutionError } from '../utils/errors.js';

export class SQLVisualizationService {
  private parser: SQLParserService;

  constructor() {
    this.parser = new SQLParserService();
  }

  /**
   * Generate a complete visualization of a SELECT query execution
   */
  async visualizeQuery(connection: PoolConnection, schemaName: string, query: string): Promise<QueryVisualization> {
    const repository = new SQLRepository(connection, schemaName);

    // Parse execution order
    const executionSteps = this.parser.parseExecutionOrder(query);

    // Parse the query structure
    const parsedQuery = this.parser.parseSelectQuery(query);

    // Generate data flow visualization
    const dataFlow = await this.generateDataFlow(repository, parsedQuery, executionSteps);

    // Execute the final query to get results
    const finalResult = await this.executeFinalQuery(repository, query, parsedQuery);

    return {
      originalQuery: query,
      executionSteps,
      dataFlow,
      finalResult,
    };
  }

  /**
   * Generate data flow for each execution step
   */
  private async generateDataFlow(
    repository: SQLRepository,
    parsedQuery: ParsedSelectQuery,
    executionSteps: ExecutionStep[]
  ): Promise<DataFlowStep[]> {
    const dataFlow: DataFlowStep[] = [];

    // Get the primary table name
    const primaryTable = parsedQuery.from[0]?.table;
    if (!primaryTable) {
      throw new SQLExecutionError('No table specified in query');
    }

    // Step 1: FROM - Get all data from the table(s)
    let currentRows: RowState[] = [];
    let currentColumns: string[] = [];

    const fromStep = executionSteps.find((s) => s.type === 'FROM');
    if (fromStep) {
      const tableData = await repository.getTableData(primaryTable);
      currentRows = tableData.rows.map((row) => ({
        data: row,
        included: true,
      }));
      currentColumns = tableData.columns;

      dataFlow.push(this.createDataFlowStep(fromStep, currentRows, currentColumns));
    }

    // Handle JOINs
    const joinSteps = executionSteps.filter((s) => s.type === 'JOIN');
    for (const joinStep of joinSteps) {
      // For simplicity, we'll show the joined data
      // In a real implementation, you'd execute the actual join logic
      const joinMatch = joinStep.clause.match(/JOIN\s+`?(\w+)`?/i);
      if (joinMatch?.[1]) {
        const joinTableName = joinMatch[1];
        const joinTableData = await repository.getTableData(joinTableName);

        // Add columns from joined table (prefixed to avoid conflicts)
        const newColumns = joinTableData.columns.map((c) => `${joinTableName}.${c}`);
        currentColumns = [...currentColumns, ...newColumns];

        // Simulate join (simplified - actual join would need ON condition evaluation)
        dataFlow.push(this.createDataFlowStep(joinStep, currentRows, currentColumns));
      }
    }

    // Step 2: WHERE - Filter rows
    const whereStep = executionSteps.find((s) => s.type === 'WHERE');
    if (whereStep && parsedQuery.where) {
      currentRows = this.applyWhereFilter(currentRows, parsedQuery.where);
      dataFlow.push(this.createDataFlowStep(whereStep, currentRows, currentColumns));
    }

    // Step 3: GROUP BY
    const groupByStep = executionSteps.find((s) => s.type === 'GROUP BY');
    if (groupByStep && parsedQuery.groupBy) {
      // For GROUP BY, we'd need to actually group the data
      // This is a simplified representation
      dataFlow.push(this.createDataFlowStep(groupByStep, currentRows, currentColumns));
    }

    // Step 4: HAVING
    const havingStep = executionSteps.find((s) => s.type === 'HAVING');
    if (havingStep && parsedQuery.having) {
      currentRows = this.applyHavingFilter(currentRows, parsedQuery.having);
      dataFlow.push(this.createDataFlowStep(havingStep, currentRows, currentColumns));
    }

    // Step 5: SELECT - Project columns
    const selectStep = executionSteps.find((s) => s.type === 'SELECT');
    if (selectStep) {
      const selectedColumns = this.resolveSelectedColumns(parsedQuery.columns, currentColumns);
      currentRows = this.projectColumns(currentRows, selectedColumns);
      currentColumns = selectedColumns;
      dataFlow.push(this.createDataFlowStep(selectStep, currentRows, currentColumns));
    }

    // Step 6: DISTINCT
    const distinctStep = executionSteps.find((s) => s.type === 'DISTINCT');
    if (distinctStep && parsedQuery.isDistinct) {
      currentRows = this.applyDistinct(currentRows);
      dataFlow.push(this.createDataFlowStep(distinctStep, currentRows, currentColumns));
    }

    // Step 7: ORDER BY
    const orderByStep = executionSteps.find((s) => s.type === 'ORDER BY');
    if (orderByStep && parsedQuery.orderBy) {
      currentRows = this.applyOrderBy(currentRows, parsedQuery.orderBy);
      dataFlow.push(this.createDataFlowStep(orderByStep, currentRows, currentColumns));
    }

    // Step 8: LIMIT
    const limitStep = executionSteps.find((s) => s.type === 'LIMIT');
    if (limitStep && parsedQuery.limit !== undefined) {
      currentRows = this.applyLimit(currentRows, parsedQuery.limit);
      dataFlow.push(this.createDataFlowStep(limitStep, currentRows, currentColumns));
    }

    // Step 9: OFFSET
    const offsetStep = executionSteps.find((s) => s.type === 'OFFSET');
    if (offsetStep && parsedQuery.offset !== undefined) {
      currentRows = this.applyOffset(currentRows, parsedQuery.offset);
      dataFlow.push(this.createDataFlowStep(offsetStep, currentRows, currentColumns));
    }

    return dataFlow;
  }

  /**
   * Create a data flow step with statistics
   */
  private createDataFlowStep(
    executionStep: ExecutionStep,
    rows: RowState[],
    columns: string[]
  ): DataFlowStep {
    const includedRows = rows.filter((r) => r.included).length;
    const excludedRows = rows.filter((r) => !r.included).length;

    return {
      stepOrder: executionStep.order,
      stepType: executionStep.type,
      rows: [...rows], // Copy to preserve state at this step
      columns: [...columns],
      description: executionStep.description,
      stats: {
        totalRows: rows.length,
        includedRows,
        excludedRows,
      },
    };
  }

  /**
   * Apply WHERE filter to rows (simplified evaluation)
   */
  private applyWhereFilter(rows: RowState[], whereClause: string): RowState[] {
    // This is a simplified WHERE evaluation
    // In production, you'd use a proper expression parser
    return rows.map((row) => {
      if (!row.included) return row;

      const isMatch = this.evaluateSimpleCondition(row.data, whereClause);

      return {
        ...row,
        included: isMatch,
        excludedReason: isMatch ? undefined : `Does not match: ${whereClause}`,
      };
    });
  }

  /**
   * Apply HAVING filter (simplified)
   */
  private applyHavingFilter(rows: RowState[], havingClause: string): RowState[] {
    return rows.map((row) => {
      if (!row.included) return row;

      const isMatch = this.evaluateSimpleCondition(row.data, havingClause);

      return {
        ...row,
        included: isMatch,
        excludedReason: isMatch ? undefined : `Does not match HAVING: ${havingClause}`,
      };
    });
  }

  /**
   * Evaluate a simple condition against row data
   */
  private evaluateSimpleCondition(data: Record<string, unknown>, condition: string): boolean {
    // Parse simple conditions like "column > value", "column = value", etc.
    const operators = ['>=', '<=', '!=', '<>', '=', '>', '<', 'LIKE', 'IN'];

    for (const op of operators) {
      const regex = new RegExp(`(\\w+)\\s*${op.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*(.+)`, 'i');
      const match = condition.match(regex);

      if (match) {
        const column = match[1];
        let value = match[2]?.trim();

        if (!column || value === undefined) continue;

        // Remove quotes from string values
        if (value.startsWith("'") && value.endsWith("'")) {
          value = value.slice(1, -1);
        }

        const columnValue = data[column];

        switch (op.toUpperCase()) {
          case '=':
            return String(columnValue) === value || columnValue === Number(value);
          case '!=':
          case '<>':
            return String(columnValue) !== value && columnValue !== Number(value);
          case '>':
            return Number(columnValue) > Number(value);
          case '<':
            return Number(columnValue) < Number(value);
          case '>=':
            return Number(columnValue) >= Number(value);
          case '<=':
            return Number(columnValue) <= Number(value);
          case 'LIKE':
            const pattern = value.replace(/%/g, '.*').replace(/_/g, '.');
            return new RegExp(`^${pattern}$`, 'i').test(String(columnValue));
          default:
            return true;
        }
      }
    }

    // Handle AND/OR conditions (simplified - only handles simple cases)
    if (condition.toUpperCase().includes(' AND ')) {
      const parts = condition.split(/\s+AND\s+/i);
      return parts.every((part) => this.evaluateSimpleCondition(data, part));
    }

    if (condition.toUpperCase().includes(' OR ')) {
      const parts = condition.split(/\s+OR\s+/i);
      return parts.some((part) => this.evaluateSimpleCondition(data, part));
    }

    // If we can't parse the condition, include the row
    return true;
  }

  /**
   * Resolve selected columns (* to actual column names)
   */
  private resolveSelectedColumns(selected: string[], available: string[]): string[] {
    if (selected.length === 1 && selected[0] === '*') {
      return available;
    }

    return selected.map((col) => {
      // Handle column aliases like "column AS alias"
      const aliasMatch = col.match(/(.+)\s+AS\s+(\w+)/i);
      if (aliasMatch) {
        return aliasMatch[2] ?? col;
      }
      return col;
    });
  }

  /**
   * Project specific columns from rows
   */
  private projectColumns(rows: RowState[], columns: string[]): RowState[] {
    return rows.map((row) => {
      const projectedData: Record<string, unknown> = {};

      for (const col of columns) {
        // Handle column aliases
        const aliasMatch = col.match(/(.+)\s+AS\s+(\w+)/i);
        if (aliasMatch) {
          const sourceCol = aliasMatch[1]?.trim();
          const alias = aliasMatch[2];
          if (sourceCol && alias) {
            projectedData[alias] = row.data[sourceCol];
          }
        } else if (col === '*') {
          Object.assign(projectedData, row.data);
        } else {
          projectedData[col] = row.data[col];
        }
      }

      return {
        ...row,
        data: projectedData,
      };
    });
  }

  /**
   * Apply DISTINCT - mark duplicates as excluded
   */
  private applyDistinct(rows: RowState[]): RowState[] {
    const seen = new Set<string>();

    return rows.map((row) => {
      if (!row.included) return row;

      const key = JSON.stringify(row.data);

      if (seen.has(key)) {
        return {
          ...row,
          included: false,
          excludedReason: 'Duplicate row removed by DISTINCT',
        };
      }

      seen.add(key);
      return row;
    });
  }

  /**
   * Apply ORDER BY - sort rows
   */
  private applyOrderBy(
    rows: RowState[],
    orderBy: { column: string; direction: 'ASC' | 'DESC' }[]
  ): RowState[] {
    return [...rows].sort((a, b) => {
      for (const { column, direction } of orderBy) {
        const aVal = a.data[column];
        const bVal = b.data[column];

        let comparison = 0;
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          comparison = aVal - bVal;
        } else {
          comparison = String(aVal).localeCompare(String(bVal));
        }

        if (comparison !== 0) {
          return direction === 'DESC' ? -comparison : comparison;
        }
      }
      return 0;
    });
  }

  /**
   * Apply LIMIT - mark excess rows as excluded
   */
  private applyLimit(rows: RowState[], limit: number): RowState[] {
    let includedCount = 0;

    return rows.map((row) => {
      if (!row.included) return row;

      includedCount++;

      if (includedCount > limit) {
        return {
          ...row,
          included: false,
          excludedReason: `Excluded by LIMIT ${limit}`,
        };
      }

      return row;
    });
  }

  /**
   * Apply OFFSET - mark skipped rows as excluded
   */
  private applyOffset(rows: RowState[], offset: number): RowState[] {
    let includedCount = 0;

    return rows.map((row) => {
      if (!row.included) return row;

      includedCount++;

      if (includedCount <= offset) {
        return {
          ...row,
          included: false,
          excludedReason: `Skipped by OFFSET ${offset}`,
        };
      }

      return row;
    });
  }

  /**
   * Execute the final query to get actual results
   */
  private async executeFinalQuery(
    repository: SQLRepository,
    query: string,
    parsedQuery: ParsedSelectQuery
  ): Promise<TableData> {
    const rows = await repository.executeQuery(query);

    // Determine column names from the query or first row
    let columns: string[];
    if (rows.length > 0 && rows[0]) {
      columns = Object.keys(rows[0]);
    } else {
      columns = parsedQuery.columns.filter((c) => c !== '*');
    }

    return {
      tableName: 'Query Result',
      columns,
      rows,
    };
  }
}
