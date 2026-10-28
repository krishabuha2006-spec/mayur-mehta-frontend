import React from 'react';
import './Table.css';

export function Table({
  columns = [], // [{ key, title, align: 'left'|'right'|'center', render }]
  data = [],
  loading = false,
  emptyMessage = 'No records found',
  className = ''
}) {
  return (
    <div className={`table-container ${className}`}>
      <table className="custom-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`table-th align-${col.align || 'left'}`}
                style={col.width ? { width: col.width } : {}}
              >
                {col.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="table-loading-cell">
                <div className="skeleton-pulse" style={{ height: '40px', width: '100%' }} />
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="table-empty-cell">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, index) => (
              <tr key={row.id || index} className="table-tr">
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`table-td align-${col.align || 'left'}`}
                  >
                    {col.render ? col.render(row[col.key], row, index) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
