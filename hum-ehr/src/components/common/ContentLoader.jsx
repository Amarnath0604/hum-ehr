import './ContentLoader.css';

/**
 * Shared shimmer content loaders, shown while section data is being fetched
 * (same look as the patient-list skeleton; React counterparts of the legacy
 * <content-loader-table-details> / <content-loader-view-details> elements).
 */

/** Table-shaped loader: header row (column labels) + shimmering body rows. */
export const SkeletonTable = ({ columns = ['', '', '', ''], rows = 5 }) => (
    <div className="table-responsive">
      <table className="table table-hover border w-100 mb-0">
        <thead className="table-light">
          <tr>
            {columns.map((header, index) => (
              <th key={index} className="small text-muted fw-semibold">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex}>
              {columns.map((_, colIndex) => (
                <td key={colIndex}>
                  <div className="cl-skeleton-bar" style={{ width: colIndex === 0 ? 24 : `${55 + ((rowIndex + colIndex) % 4) * 15}%` }}/>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
);

/** Left-pane record list loader: stacked card rows with two shimmer lines. */
export const SkeletonList = ({ rows = 6 }) => (
    <div>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="cl-list-row">
          <div className="cl-skeleton-bar mb-2" style={{ width: `${60 + (index % 3) * 12}%` }}/>
          <div className="cl-skeleton-bar cl-sm" style={{ width: `${30 + (index % 4) * 10}%` }}/>
        </div>
      ))}
    </div>
);

/** Detail/view pane loader: label + value shimmer pairs in a grid. */
export const SkeletonViewDetails = ({ rows = 3, cols = 3, avatar = false }) => (
    <div className="d-flex gap-4 p-2">
      {avatar && <div className="cl-skeleton-circle" style={{ width: 110, height: 110, minWidth: 110 }}/>}
      <div className="flex-grow-1">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div className="row my-4" key={rowIndex}>
            {Array.from({ length: cols }).map((_, colIndex) => (
              <div className="col" key={colIndex}>
                <div className="cl-skeleton-bar cl-sm mb-2" style={{ width: '45%' }}/>
                <div className="cl-skeleton-bar" style={{ width: `${55 + ((rowIndex + colIndex) % 3) * 15}%` }}/>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
);

