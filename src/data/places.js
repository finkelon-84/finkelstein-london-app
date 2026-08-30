/* ============================================================
   PLACES DATA
   ------------------------------------------------------------
   This is the single source of truth for every attraction and
   restaurant the app knows about. Update ratings, add places, or
   fix coordinates here — nothing else in the app needs to change.

   Fields:
     id        unique slug, used as a foreign key from itinerary stops
     nameEn    English name, shown with dir="ltr"
     category  "attraction" | "restaurant"
     tagHe     short Hebrew description shown under the name
     indoor    true/false — used for rainy-day recommendations
     rating    Google rating (number) — optional, attractions only for now
     lat, lng  coordinates, used for distance/walking-time calculations
   ============================================================ */

export const PLACES = [
  { id: "nhm", nameEn: "Natural History Museum", category: "attraction", tagHe: "מוזיאון · אינטראקטיבי לילדים", indoor: true, rating: 4.7, lat: 51.4967, lng: -0.1764 },
  { id: "sci", nameEn: "Science Museum", category: "attraction", tagHe: "מוזיאון · אינטראקטיבי", indoor: true, rating: 4.6, lat: 51.4978, lng: -0.1745 },
  { id: "vam", nameEn: "Young V&A", category: "attraction", tagHe: "מוזיאון ילדים", indoor: true, rating: 4.5, lat: 51.5279, lng: -0.0723 },
  { id: "hyde", nameEn: "Hyde Park", category: "attraction", tagHe: "פארק · חוץ", indoor: false, rating: 4.7, lat: 51.5073, lng: -0.1657 },
  { id: "tol", nameEn: "Tower of London", category: "attraction", tagHe: "מצודה היסטורית", indoor: true, rating: 4.6, lat: 51.5081, lng: -0.0759 },
  { id: "zoo", nameEn: "London Zoo", category: "attraction", tagHe: "גן חיות", indoor: false, rating: 4.5, lat: 51.5353, lng: -0.1536 },
  { id: "ltm", nameEn: "London Transport Museum", category: "attraction", tagHe: "מוזיאון תחבורה", indoor: true, rating: 4.6, lat: 51.5117, lng: -0.1223 },
  { id: "ng", nameEn: "National Gallery", category: "attraction", tagHe: "גלריית אמנות", indoor: true, rating: 4.8, lat: 51.5089, lng: -0.1283 },
  { id: "diana", nameEn: "Diana Memorial Playground", category: "attraction", tagHe: "מגרש משחקים", indoor: false, rating: 4.6, lat: 51.5063, lng: -0.1804 },
  { id: "cgm", nameEn: "Covent Garden Market", category: "attraction", tagHe: "שוק מקורה", indoor: true, rating: 4.5, lat: 51.5117, lng: -0.1240 },
  { id: "onc", nameEn: "One New Change", category: "attraction", tagHe: "קניון נגיש לעגלה", indoor: true, rating: 4.3, lat: 51.5138, lng: -0.0938 },
  { id: "hamleys", nameEn: "Hamleys", category: "attraction", tagHe: "חנות צעצועים", indoor: true, rating: 4.4, lat: 51.5136, lng: -0.1409 },
  { id: "dishoom", nameEn: "Dishoom Covent Garden", category: "restaurant", tagHe: "מסעדה הודית · ידידותי למשפחות", indoor: true, lat: 51.5121, lng: -0.1257 },
  { id: "flatwhite", nameEn: "Flat White Soho", category: "restaurant", tagHe: "בית קפה · ישיבה בחוץ", indoor: false, lat: 51.5136, lng: -0.1319 },
  { id: "pizzaexp", nameEn: "Pizza Express Trafalgar", category: "restaurant", tagHe: "מסעדה איטלקית · כיסא תינוק", indoor: true, lat: 51.5080, lng: -0.1281 },
  { id: "vacafe", nameEn: "V&A Café", category: "restaurant", tagHe: "קפה/ארוחה קלה בתוך המוזיאון · ליד הנטורל היסטורי", indoor: true, lat: 51.4966, lng: -0.1722 },
  { id: "franco", nameEn: "Franco Manca", category: "restaurant", tagHe: "פיצה איטלקית", indoor: true, lat: 51.5117, lng: -0.1350 },
  { id: "bustour", nameEn: "London Bus Tour + Thames River Cruise", category: "attraction", tagHe: "אוטובוס תיירים פתוח + שייט בתמזה", indoor: false, rating: 4.5, lat: 51.5080, lng: -0.1281 },
  { id: "chinatown", nameEn: "Chinatown London", category: "restaurant", tagHe: "צהריים קלים · נודלס ודמפלינגס", indoor: true, lat: 51.5114, lng: -0.1308 },
  { id: "lego", nameEn: "LEGO Store Leicester Square", category: "attraction", tagHe: "חנות צעצועים ענקית", indoor: true, rating: 4.6, lat: 51.5104, lng: -0.1300 },
  { id: "mms", nameEn: "M&M'S World Leicester Square", category: "attraction", tagHe: "חנות ממתקים צבעונית", indoor: true, rating: 4.3, lat: 51.5103, lng: -0.1302 },
  { id: "hsk", nameEn: "High Street Kensington", category: "attraction", tagHe: "קניות ידידותיות לעגלה · Zara, TK Maxx", indoor: true, rating: 4.2, lat: 51.5009, lng: -0.1925 },
  { id: "cgshop", nameEn: "Covent Garden Boutiques", category: "attraction", tagHe: "בוטיקים, איפור וסטייל", indoor: true, rating: 4.4, lat: 51.5118, lng: -0.1225 },
  { id: "finalshop", nameEn: "Trafalgar / Soho Shopping", category: "attraction", tagHe: "קניות השלמה ליד המלון", indoor: true, rating: 4.2, lat: 51.5100, lng: -0.1310 },
];

export const placeById = (id) => PLACES.find((p) => p.id === id);
