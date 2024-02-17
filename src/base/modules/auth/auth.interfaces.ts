export interface AuthAccessGeneric<filterRows, ExcludedColumns> {
  // operations
  read?: boolean | AuthAccessOperationGeneric<filterRows, ExcludedColumns>;
  create?: boolean | AuthAccessOperationGeneric<filterRows, ExcludedColumns>;
  update?: boolean | AuthAccessOperationGeneric<filterRows, ExcludedColumns>;
  delete?: boolean | AuthAccessOperationGeneric<filterRows, ExcludedColumns>;
}

export interface AuthAccessOperationGeneric<filterRows, ExcludedColumns> {
  filterRows: filterRows;
  excludeCols: ExcludedColumns[];
}
