import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Keyboard,
  Dimensions,
  Platform,
  Animated,
  Linking,
} from 'react-native';
import MapView, { Marker, Callout, PROVIDER_DEFAULT, Polyline } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

const MATI_COORDS = {
  latitude: 6.9537,
  longitude: 126.2407,
  latitudeDelta: 0.1,
  longitudeDelta: 0.1,
};

const CATEGORIES = [
  { id: 'All', icon: 'apps' },
  { id: 'Beach', icon: 'sunny' },
  { id: 'Restaurant', icon: 'restaurant' },
  { id: 'Hotel', icon: 'bed' },
  { id: 'Park', icon: 'leaf' },
  { id: 'Cafe', icon: 'cafe' },
];

export default function MapScreen() {
  const mapRef = useRef<MapView>(null);
  const scrollRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [places, setPlaces] = useState<any[]>([]);
  const [weather, setWeather] = useState<any>(null);
  const [selectedPlace, setSelectedPlace] = useState<any>(null);
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<any[]>([]);
  
  const [loadingPlaces, setLoadingPlaces] = useState(false);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const WEATHER_API_KEY = process.env.EXPO_PUBLIC_WEATHER_API_KEY;

  const fetchWeather = useCallback(async (lat: number, lon: number, placeName: string) => {
    if (!WEATHER_API_KEY) return;
    
    setLoadingWeather(true);
    setError(null);
    try {
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}&units=metric`
      );
      const data = await response.json();
      setWeather(data);
      
      // Animate the weather panel in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingWeather(false);
    }
  }, [WEATHER_API_KEY, fadeAnim]);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setUserLocation(loc);
      }
    })();
  }, []);

  const fetchRoute = async (destLat: number, destLon: number) => {
    if (!userLocation) return;
    
    try {
      // Use OSRM (Open Source Routing Machine) - Free & No Key Needed
      const url = `https://router.project-osrm.org/route/v1/driving/${userLocation.coords.longitude},${userLocation.coords.latitude};${destLon},${destLat}?overview=full&geometries=geojson`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        const coords = data.routes[0].geometry.coordinates.map((c: any) => ({
          latitude: c[1],
          longitude: c[0],
        }));
        setRouteCoordinates(coords);
      }
    } catch (err) {
      console.error('Routing Error:', err);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoadingPlaces(true);
    setError(null);
    Keyboard.dismiss();
    setActiveCategory('All');

    try {
      const results = await Location.geocodeAsync(`${searchQuery}, Mati City`);
      if (results && results.length > 0) {
        const first = results[0];
        const newPlace = {
          id: Date.now().toString(),
          name: searchQuery,
          coordinate: { latitude: first.latitude, longitude: first.longitude },
          category: 'Search Result'
        };
        setPlaces([newPlace]);
        mapRef.current?.animateToRegion({
          ...newPlace.coordinate,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }, 1000);
        onSelectPlace(newPlace);
      } else {
        setError(`No results for "${searchQuery}"`);
      }
    } catch (err) {
      setError('Search failed');
    } finally {
      setLoadingPlaces(false);
    }
  };

  const fetchNearbyPOIs = async (category: string) => {
    setLoadingPlaces(true);
    setPlaces([]);
    setRouteCoordinates([]);
    
    if (category === 'All') {
      setLoadingPlaces(false);
      return;
    }

    const categoryMap: any = {
      'Beach': 'natural=beach',
      'Restaurant': 'amenity=restaurant',
      'Hotel': 'tourism=hotel',
      'Park': 'leisure=park',
      'Cafe': 'amenity=cafe',
    };

    const tag = categoryMap[category];
    const query = `[out:json][timeout:25];(node[${tag}](6.85,126.15,7.05,126.35);way[${tag}](6.85,126.15,7.05,126.35);relation[${tag}](6.85,126.15,7.05,126.35););out center;`;

    try {
      const response = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
      const data = await response.json();
      
      const livePlaces = data.elements.map((el: any) => ({
        id: el.id.toString(),
        name: el.tags.name || `${category}`,
        coordinate: {
          latitude: el.lat || el.center.lat,
          longitude: el.lon || el.center.lon,
        },
        category: category,
      }));
      
      setPlaces(livePlaces);
      if (livePlaces.length > 0) {
        mapRef.current?.animateToRegion({
          ...livePlaces[0].coordinate,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }, 1000);
      }
    } catch (err) {
      setError(`Failed to fetch ${category}s`);
    } finally {
      setLoadingPlaces(false);
    }
  };

  const onSelectPlace = (place: any) => {
    setSelectedPlace(place);
    mapRef.current?.animateToRegion({
      ...place.coordinate,
      latitudeDelta: 0.015,
      longitudeDelta: 0.015,
    }, 800);
    fetchWeather(place.coordinate.latitude, place.coordinate.longitude, place.name);
    fetchRoute(place.coordinate.latitude, place.coordinate.longitude);
  };

  const handleGo = () => {
    if (!selectedPlace) return;
    const { latitude, longitude } = selectedPlace.coordinate;
    const label = encodeURIComponent(selectedPlace.name);
    
    const url = Platform.select({
      ios: `maps://0,0?q=${label}@${latitude},${longitude}`,
      android: `geo:0,0?q=${latitude},${longitude}(${label})`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`
    });

    Linking.openURL(url);
  };

  const getCategoryIcon = (catId: string) => {
    return CATEGORIES.find(c => c.id === catId)?.icon || 'location';
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={Platform.OS === 'android' ? PROVIDER_DEFAULT : undefined}
        style={styles.map}
        initialRegion={MATI_COORDS}
        showsUserLocation={true}
        showsMyLocationButton={false}
        onPoiClick={(e) => {
          const { coordinate, name } = e.nativeEvent;
          onSelectPlace({ name, coordinate, category: 'Point of Interest' });
        }}
        onPress={() => {
          Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
            setSelectedPlace(null);
            setRouteCoordinates([]);
          });
        }}
      >
        {places.map((place) => (
          <Marker
            key={place.id}
            coordinate={place.coordinate}
            onPress={() => onSelectPlace(place)}
            tracksViewChanges={false}
          >
            <View style={[styles.markerContainer, selectedPlace?.id === place.id && styles.selectedMarker]}>
              <Ionicons name={getCategoryIcon(place.category) as any} size={18} color="#fff" />
            </View>
          </Marker>
        ))}

        {routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="#007BFF"
            strokeWidth={4}
            lineDashPattern={[0]}
          />
        )}
      </MapView>

      {/* Floating Header */}
      <SafeAreaView style={styles.headerContainer} pointerEvents="box-none">
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search Mati City..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
          />
          {loadingPlaces && <ActivityIndicator size="small" color="#007BFF" />}
        </View>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.categoriesList}
          contentContainerStyle={styles.categoriesContent}
        >
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.categoryChip, activeCategory === cat.id && styles.activeCategoryChip]}
              onPress={() => {
                setActiveCategory(cat.id);
                fetchNearbyPOIs(cat.id);
              }}
            >
              <Ionicons name={cat.icon as any} size={16} color={activeCategory === cat.id ? '#fff' : '#555'} />
              <Text style={[styles.categoryText, activeCategory === cat.id && styles.activeCategoryText]}>
                {cat.id}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>

      {/* Detailed Info / Weather Panel */}
      {selectedPlace && (
        <Animated.View style={[styles.infoPanel, { opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [100, 0] }) }] }]}>
          <View style={styles.panelHeader}>
            <View style={styles.panelTitleContainer}>
              <Text style={styles.panelTitle} numberOfLines={1}>{selectedPlace.name}</Text>
              <Text style={styles.panelSubtitle}>{selectedPlace.category}</Text>
            </View>
            <TouchableOpacity onPress={() => Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
              setSelectedPlace(null);
              setRouteCoordinates([]);
            })}>
              <Ionicons name="close-circle" size={28} color="#DDD" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.weatherSummary}>
            {loadingWeather ? (
              <ActivityIndicator color="#007BFF" />
            ) : weather ? (
              <View style={styles.weatherRow}>
                <View style={styles.weatherMain}>
                  <Text style={styles.weatherTemp}>{Math.round(weather.main.temp)}°C</Text>
                  <Text style={styles.weatherDesc}>{weather.weather[0].description}</Text>
                </View>
                <View style={styles.weatherDivider} />
                <View style={styles.weatherExtra}>
                  <View style={styles.extraItem}>
                    <Ionicons name="water-outline" size={14} color="#555" />
                    <Text style={styles.extraText}>{weather.main.humidity}%</Text>
                  </View>
                  <View style={styles.extraItem}>
                    <Ionicons name="leaf-outline" size={14} color="#555" />
                    <Text style={styles.extraText}>{weather.wind.speed}m/s</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.directionsButton} onPress={handleGo}>
                  <Ionicons name="navigate" size={20} color="#fff" />
                  <Text style={styles.directionsText}>Go</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        </Animated.View>
      )}

      {/* Locate Me Button - Moved to end for top-level interaction */}
      <TouchableOpacity 
        style={styles.fab} 
        activeOpacity={0.8}
        onPress={async () => {
          try {
            setLoadingPlaces(true);
            const { status } = await Location.getForegroundPermissionsAsync();
            if (status !== 'granted') {
              const request = await Location.requestForegroundPermissionsAsync();
              if (request.status !== 'granted') {
                setError('Location permission required');
                return;
              }
            }
            
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            setUserLocation(loc);
            mapRef.current?.animateToRegion({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
              latitudeDelta: 0.015,
              longitudeDelta: 0.015,
            }, 1000);
            
            fetchWeather(loc.coords.latitude, loc.coords.longitude, 'Your Location');
          } catch (err) {
            setError('Could not get your location');
          } finally {
            setLoadingPlaces(false);
          }
        }}
      >
        <Ionicons name="locate" size={26} color="#007BFF" />
      </TouchableOpacity>

      {error && (
        <View style={styles.errorToast}>
          <Text style={styles.errorToastText}>{error}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  map: {
    flex: 1,
  },
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  searchBar: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 10,
    height: 50,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  categoriesList: {
    marginTop: 12,
  },
  categoriesContent: {
    paddingHorizontal: 20,
    paddingBottom: 5,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  activeCategoryChip: {
    backgroundColor: '#007BFF',
  },
  categoryText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
  },
  activeCategoryText: {
    color: '#fff',
  },
  markerContainer: {
    backgroundColor: '#007BFF',
    padding: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  selectedMarker: {
    backgroundColor: '#FF5252',
    transform: [{ scale: 1.2 }],
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 40,
    backgroundColor: '#fff',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 99,
  },
  resultsContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    zIndex: 50,
  },
  resultsContent: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  resultCard: {
    backgroundColor: '#fff',
    width: 220,
    borderRadius: 18,
    padding: 12,
    marginRight: 15,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  resultIconBackground: {
    backgroundColor: '#E6F2FF',
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  resultTextContainer: {
    flex: 1,
  },
  resultName: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#333',
  },
  resultCategory: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  infoPanel: {
    position: 'absolute',
    bottom: 25,
    left: 20,
    right: 20,
    backgroundColor: '#fff',
    borderRadius: 25,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
    zIndex: 90,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  panelTitleContainer: {
    flex: 1,
  },
  panelTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E293B',
  },
  panelSubtitle: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  weatherSummary: {
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 15,
  },
  weatherRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weatherMain: {
    flex: 1,
  },
  weatherTemp: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  weatherDesc: {
    fontSize: 12,
    color: '#64748B',
    textTransform: 'capitalize',
  },
  weatherDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 15,
  },
  weatherExtra: {
    marginRight: 15,
  },
  extraItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 2,
  },
  extraText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  directionsButton: {
    backgroundColor: '#007BFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 15,
    gap: 6,
  },
  directionsText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  errorToast: {
    position: 'absolute',
    top: 130,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  errorToastText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
});