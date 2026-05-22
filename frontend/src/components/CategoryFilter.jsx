import { PLACE_CATEGORIES } from '../utils/placeCategories'
import './CategoryFilter.css'

export default function CategoryFilter({
  activeCategories,
  onChange,
  placeCounts,
}) {
  const toggle = (id) => {
    const next = new Set(activeCategories)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onChange(next)
  }

  const clearAll = () => onChange(new Set())

  return (
    <div className="category-filter">
      <div className="category-filter__header">
        <span className="category-filter__title">Categories</span>
        {activeCategories.size > 0 && (
          <button
            type="button"
            className="category-filter__clear"
            onClick={clearAll}
          >
            Show all
          </button>
        )}
      </div>
      <ul className="category-filter__list">
        {PLACE_CATEGORIES.map(({ id, label }) => {
          const count = placeCounts?.[id] ?? 0
          const active = activeCategories.has(id)
          return (
            <li key={id}>
              <label className="category-filter__option">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={() => toggle(id)}
                />
                <span className="category-filter__label">{label}</span>
                <span className="category-filter__count">{count}</span>
              </label>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
