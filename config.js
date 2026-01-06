// Configuración de fuentes RSS
const RSS_FEEDS = {
    reuters: {
        name: 'Reuters',
        urls: [
            'https://www.reutersagency.com/feed/',
            'https://www.reuters.com/rssfeed/worldNews',
        ],
        color: '#FF6B00'
    },
    afp: {
        name: 'AFP',
        urls: [
            'https://www.afp.com/en/news/feed',
        ],
        color: '#E63946'
    },
    tass: {
        name: 'TASS',
        urls: [
            'https://tass.com/rss/v2.xml',
        ],
        color: '#457B9D'
    },
    politico: {
        name: 'Politico',
        urls: [
            'https://www.politico.com/rss/politicopicks.xml',
            'https://www.politico.com/rss/congress.xml',
        ],
        color: '#DC143C'
    },
    lemonde: {
        name: 'Le Monde',
        urls: [
            'https://www.lemonde.fr/rss/une.xml',
            'https://www.lemonde.fr/international/rss_full.xml',
        ],
        color: '#003D5C'
    },
    guardian: {
        name: 'The Guardian',
        urls: [
            'https://www.theguardian.com/world/rss',
            'https://www.theguardian.com/international/rss',
        ],
        color: '#052962'
    },
    telegraph: {
        name: 'The Telegraph',
        urls: [
            'https://www.telegraph.co.uk/rss.xml',
        ],
        color: '#004A77'
    },
    aljazeera: {
        name: 'Al Jazeera',
        urls: [
            'https://www.aljazeera.com/xml/rss/all.xml',
        ],
        color: '#F39200'
    }
};

// Configuración de regiones
const REGIONS = {
    europe: {
        name: 'Europa',
        keywords: ['europe', 'european', 'eu', 'brussels', 'london', 'paris', 'berlin', 'madrid', 'rome', 
                  'moscow', 'ukraine', 'russia', 'poland', 'germany', 'france', 'uk', 'spain', 'italy'],
        bounds: [[35, -10], [71, 40]]
    },
    americas: {
        name: 'Américas',
        keywords: ['america', 'us', 'usa', 'united states', 'canada', 'mexico', 'brazil', 'argentina', 
                  'washington', 'new york', 'toronto', 'buenos aires', 'latin america'],
        bounds: [[-55, -170], [75, -30]]
    },
    asia: {
        name: 'Asia',
        keywords: ['asia', 'china', 'japan', 'india', 'korea', 'beijing', 'tokyo', 'delhi', 'seoul', 
                  'thailand', 'vietnam', 'singapore', 'indonesia', 'pakistan'],
        bounds: [[-10, 60], [55, 150]]
    },
    africa: {
        name: 'África',
        keywords: ['africa', 'african', 'egypt', 'nigeria', 'south africa', 'kenya', 'ethiopia', 
                  'cairo', 'lagos', 'nairobi', 'johannesburg'],
        bounds: [[-35, -20], [37, 52]]
    },
    'middle-east': {
        name: 'Medio Oriente',
        keywords: ['middle east', 'israel', 'palestine', 'syria', 'iraq', 'iran', 'saudi', 'lebanon', 
                  'jordan', 'turkey', 'gulf', 'tel aviv', 'baghdad', 'tehran', 'riyadh', 'damascus'],
        bounds: [[12, 34], [42, 63]]
    },
    oceania: {
        name: 'Oceanía',
        keywords: ['australia', 'new zealand', 'sydney', 'melbourne', 'auckland', 'pacific'],
        bounds: [[-47, 110], [-10, 180]]
    }
};

// Palabras clave para detectar ubicaciones en títulos/descripciones
const LOCATION_PATTERNS = [
    // Ciudades importantes
    'London', 'Paris', 'Berlin', 'Moscow', 'Madrid', 'Rome', 'Brussels', 'Amsterdam', 'Vienna',
    'Washington', 'New York', 'Los Angeles', 'Toronto', 'Mexico City', 'Buenos Aires', 'São Paulo',
    'Beijing', 'Tokyo', 'Delhi', 'Seoul', 'Shanghai', 'Mumbai', 'Bangkok', 'Singapore',
    'Cairo', 'Lagos', 'Nairobi', 'Johannesburg', 'Cape Town',
    'Tel Aviv', 'Jerusalem', 'Baghdad', 'Tehran', 'Riyadh', 'Damascus', 'Beirut', 'Istanbul',
    'Sydney', 'Melbourne', 'Auckland',
    
    // Países
    'United States', 'USA', 'China', 'Russia', 'Germany', 'France', 'United Kingdom', 'UK',
    'Japan', 'India', 'Brazil', 'Canada', 'Australia', 'Spain', 'Italy', 'Mexico',
    'South Korea', 'Indonesia', 'Turkey', 'Saudi Arabia', 'Iran', 'Iraq', 'Syria',
    'Israel', 'Palestine', 'Egypt', 'South Africa', 'Nigeria', 'Ukraine', 'Poland',
    
    // Regiones
    'Gaza', 'West Bank', 'Crimea', 'Taiwan', 'Hong Kong', 'Kashmir', 'Donbas', 'Balkans'
];

// Coordenadas aproximadas de ubicaciones clave (para mapeo rápido)
const LOCATION_COORDS = {
    // Europa
    'London': [51.5074, -0.1278],
    'Paris': [48.8566, 2.3522],
    'Berlin': [52.5200, 13.4050],
    'Moscow': [55.7558, 37.6173],
    'Madrid': [40.4168, -3.7038],
    'Rome': [41.9028, 12.4964],
    'Brussels': [50.8503, 4.3517],
    'Amsterdam': [52.3676, 4.9041],
    'Vienna': [48.2082, 16.3738],
    'Kiev': [50.4501, 30.5234],
    'Warsaw': [52.2297, 21.0122],
    
    // Américas
    'Washington': [38.9072, -77.0369],
    'New York': [40.7128, -74.0060],
    'Los Angeles': [34.0522, -118.2437],
    'Toronto': [43.6532, -79.3832],
    'Mexico City': [19.4326, -99.1332],
    'Buenos Aires': [-34.6037, -58.3816],
    'São Paulo': [-23.5505, -46.6333],
    'Brasilia': [-15.8267, -47.9218],
    
    // Asia
    'Beijing': [39.9042, 116.4074],
    'Tokyo': [35.6762, 139.6503],
    'Delhi': [28.7041, 77.1025],
    'Seoul': [37.5665, 126.9780],
    'Shanghai': [31.2304, 121.4737],
    'Mumbai': [19.0760, 72.8777],
    'Bangkok': [13.7563, 100.5018],
    'Singapore': [1.3521, 103.8198],
    'Jakarta': [-6.2088, 106.8456],
    'Manila': [14.5995, 120.9842],
    'Taipei': [25.0330, 121.5654],
    'Hong Kong': [22.3193, 114.1694],
    
    // África
    'Cairo': [30.0444, 31.2357],
    'Lagos': [6.5244, 3.3792],
    'Nairobi': [-1.2921, 36.8219],
    'Johannesburg': [-26.2041, 28.0473],
    'Cape Town': [-33.9249, 18.4241],
    'Addis Ababa': [9.0320, 38.7469],
    
    // Medio Oriente
    'Tel Aviv': [32.0853, 34.7818],
    'Jerusalem': [31.7683, 35.2137],
    'Baghdad': [33.3152, 44.3661],
    'Tehran': [35.6892, 51.3890],
    'Riyadh': [24.7136, 46.6753],
    'Damascus': [33.5138, 36.2765],
    'Beirut': [33.8938, 35.5018],
    'Istanbul': [41.0082, 28.9784],
    'Dubai': [25.2048, 55.2708],
    'Ankara': [39.9334, 32.8597],
    
    // Oceanía
    'Sydney': [-33.8688, 151.2093],
    'Melbourne': [-37.8136, 144.9631],
    'Auckland': [-36.8485, 174.7633],
    
    // Regiones conflictivas
    'Gaza': [31.5, 34.45],
    'West Bank': [32.0, 35.25],
    'Crimea': [45.0, 34.0],
    'Taiwan': [23.7, 121.0],
    'Kashmir': [34.0, 76.0],
    'Donbas': [48.0, 38.0]
};

// Configuración general
const CONFIG = {
    UPDATE_INTERVAL: 300000, // 5 minutos en milisegundos
    NEWS_PER_PAGE: 20,
    MAX_DESCRIPTION_LENGTH: 200,
    ENABLE_AUTO_REFRESH: true,
    DEFAULT_MAP_CENTER: [20, 0], // Centro del mapa (lat, lng)
    DEFAULT_MAP_ZOOM: 2,
    CORS_PROXY: 'https://api.allorigins.win/raw?url=', // Proxy para evitar CORS
};

// Export para uso en otros archivos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { RSS_FEEDS, REGIONS, LOCATION_PATTERNS, LOCATION_COORDS, CONFIG };
}
