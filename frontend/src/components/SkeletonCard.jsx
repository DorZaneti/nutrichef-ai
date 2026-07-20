import './SkeletonCard.css';

function SkeletonCard() {
  return (
    <div className="skeleton-card" aria-hidden="true">
      <div className="skeleton-block skeleton-image" />
      <div className="skeleton-block skeleton-line w-70" />
      <div className="skeleton-block skeleton-line w-40" />
      <div className="skeleton-tags">
        <div className="skeleton-block skeleton-tag" />
        <div className="skeleton-block skeleton-tag" />
        <div className="skeleton-block skeleton-tag" />
      </div>
    </div>
  );
}

export default SkeletonCard;
