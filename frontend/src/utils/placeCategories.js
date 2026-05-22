/** User-facing filters aligned with OSM tags we fetch in overpass.py */

export const PLACE_CATEGORIES = [
  { id: 'food', label: 'Food & drink' },
  { id: 'music', label: 'Music venues' },
  { id: 'parks', label: 'Parks & recreation' },
  { id: 'culture', label: 'Arts & culture' },
  { id: 'shopping', label: 'Shopping' },
]

const FOOD_AMENITIES = new Set(['bar', 'cafe', 'restaurant'])
const CULTURE_AMENITY = new Set(['cinema', 'theatre', 'library'])
const CULTURE_TOURISM = new Set(['museum', 'gallery', 'attraction', 'artwork'])
const PARKS_LEISURE = new Set([
  'park',
  'garden',
  'sports_centre',
  'fitness_centre',
  'swimming_pool',
])
const SHOP_TYPES = new Set([
  'books',
  'music',
  'art',
  'records',
  'vintage',
  'antiques',
])

/** Return which filter categories a place belongs to (can be multiple). */
export function getPlaceCategories(place) {
  const tags = place.tags || {}
  const categories = new Set()

  const amenity = tags.amenity
  const leisure = tags.leisure
  const shop = tags.shop
  const tourism = tags.tourism

  if (amenity && FOOD_AMENITIES.has(amenity)) categories.add('food')
  if (
    amenity === 'music_venue' ||
    shop === 'music' ||
    shop === 'records' ||
    tags.music
  ) {
    categories.add('music')
  }
  if (leisure && PARKS_LEISURE.has(leisure)) categories.add('parks')
  if (
    (amenity && CULTURE_AMENITY.has(amenity)) ||
    (tourism && CULTURE_TOURISM.has(tourism))
  ) {
    categories.add('culture')
  }
  if (shop && SHOP_TYPES.has(shop)) categories.add('shopping')

  return [...categories]
}

export function placeMatchesCategories(place, activeCategoryIds) {
  if (!activeCategoryIds || activeCategoryIds.size === 0) return true
  const placeCats = getPlaceCategories(place)
  return placeCats.some((cat) => activeCategoryIds.has(cat))
}

export function filterPlacesByCategory(places, activeCategoryIds) {
  if (!activeCategoryIds || activeCategoryIds.size === 0) return places
  return places.filter((place) => placeMatchesCategories(place, activeCategoryIds))
}
