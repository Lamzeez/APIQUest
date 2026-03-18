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
  StatusBar,
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT, Polyline } from 'react-native-maps';
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
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(height)).current;
  
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

  const fetchWeather = useCallback(async (lat: number, lon: number) => {
    if (!WEATHER_API_KEY) return;
    setLoadingWeather(true);
    try {
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}&units=metric`
      );
      if (!response.ok) throw new Error('API error');
      const data = await response.json();
      if (data && data.main) setWeather(data);
    } catch (err) {
      console.error(err);
      setWeather(null);
    } finally {
      setLoadingWeather(false);
    }
  }, [WEATHER_API_KEY]);

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
      const url = `https://router.project-osrm.org/route/v1/driving/${userLocation.coords.longitude},${userLocation.coords.latitude};${destLon},${destLat}?overview=full&geometries=geojson`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.routes?.[0]) {
        setRouteCoordinates(data.routes[0].geometry.coordinates.map((c: any) => ({ latitude: c[1], longitude: c[0] })));
      }
    } catch (err) { console.error(err); }
  };

  const onSelectPlace = (place: any) => {
    setSelectedPlace(place);
    mapRef.current?.animateToRegion({ ...place.coordinate, latitudeDelta: 0.015, longitudeDelta: 0.015 }, 800);
    fetchWeather(place.coordinate.latitude, place.coordinate.longitude);
    fetchRoute(place.coordinate.latitude, place.coordinate.longitude);
    
    // Animate panel up
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true })
    ]).start();
  };

  const closePanel = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: height, duration: 300, useNativeDriver: true })
    ]).start(() => {
      setSelectedPlace(null);
      setRouteCoordinates([]);
    });
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoadingPlaces(true);
    setError(null);
    Keyboard.dismiss();
    setActiveCategory('All');
    try {
      const results = await Location.geocodeAsync(`${searchQuery}, Mati City, Davao Oriental, Philippines`);
      const matiResults = results.filter(res => Math.abs(res.latitude - MATI_COORDS.latitude) < 0.2 && Math.abs(res.longitude - MATI_COORDS.longitude) < 0.2);
      if (matiResults.length > 0) {
        const p = { id: Date.now().toString(), name: searchQuery, coordinate: matiResults[0], category: 'Search Result' };
        setPlaces([p]);
        onSelectPlace(p);
      } else {
        setError(`No results for "${searchQuery}" in Mati`);
      }
    } catch (err) { setError('Search failed'); } finally { setLoadingPlaces(false); }
  };

  const fetchNearbyPOIs = async (category: string) => {
    if (category === 'All') { setPlaces([]); return; }
    setLoadingPlaces(true);
    closePanel();
    const categoryMap: any = { 'Beach': '["natural"="beach"]', 'Restaurant': '["amenity"~"restaurant|fast_food|food_court"]', 'Hotel': '["tourism"~"hotel|resort|guest_house|hostel|motel"]', 'Park': '["leisure"~"park|garden|nature_reserve"]', 'Cafe': '["amenity"="cafe"]' };
    const query = `[out:json][timeout:25];(node${categoryMap[category]}(6.80,126.10,7.10,126.40);way${categoryMap[category]}(6.80,126.10,7.10,126.40);relation${categoryMap[category]}(6.80,126.10,7.10,126.40););out center;`;
    try {
      const response = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
      const data = await response.json();
      const live = data.elements.map((el: any) => ({ id: el.id.toString(), name: el.tags.name || `${category}`, coordinate: { latitude: el.lat || el.center.lat, longitude: el.lon || el.center.lon }, category, isDiscovered: true }));
      setPlaces(live);
      if (live.length > 0) mapRef.current?.fitToCoordinates(live.map((p: any) => p.coordinate), { edgePadding: { top: 150, right: 80, bottom: 150, left: 80 }, animated: true });
    } catch (err) { setError(`Failed to fetch ${category}s`); } finally { setLoadingPlaces(false); }
  };

  const handleGo = () => {
    if (!selectedPlace) return;
    const { latitude, longitude } = selectedPlace.coordinate;
    const url = Platform.select({ ios: `maps://0,0?q=${encodeURIComponent(selectedPlace.name)}@${latitude},${longitude}`, android: `geo:0,0?q=${latitude},${longitude}(${encodeURIComponent(selectedPlace.name)})`, default: `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}` });
    Linking.openURL(url!);
  };

  const getCategoryIcon = (catId: string) => CATEGORIES.find(c => c.id === catId)?.icon || 'location';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <MapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        style={styles.map}
        initialRegion={MATI_COORDS}
        showsUserLocation={true}
        showsMyLocationButton={false}
        onPoiClick={(e) => onSelectPlace({ name: e.nativeEvent.name, coordinate: e.nativeEvent.coordinate, category: 'Point of Interest' })}
        onPress={closePanel}
      >
        {places.map((place) => (
          <Marker key={place.id} coordinate={place.coordinate} onPress={() => onSelectPlace(place)}>
            <View style={[styles.markerContainer, place.isDiscovered && styles.discoveredMarker, selectedPlace?.id === place.id && styles.selectedMarker]}>
              <Ionicons name={getCategoryIcon(place.category) as any} size={16} color="#fff" />
            </View>
          </Marker>
        ))}
        {routeCoordinates.length > 0 && <Polyline coordinates={routeCoordinates} strokeColor="#007BFF" strokeWidth={4} />}
      </MapView>

      <SafeAreaView style={styles.topOverlay} pointerEvents="box-none">
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#64748B" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search Mati City..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            placeholderTextColor="#94A3B8"
          />
          {loadingPlaces && <ActivityIndicator size="small" color="#007BFF" />}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesList} contentContainerStyle={styles.categoriesContent}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity key={cat.id} style={[styles.categoryChip, activeCategory === cat.id && styles.activeCategoryChip]} onPress={() => { setActiveCategory(cat.id); fetchNearbyPOIs(cat.id); }}>
              <Ionicons name={cat.icon as any} size={16} color={activeCategory === cat.id ? '#fff' : '#475569'} />
              <Text style={[styles.categoryText, activeCategory === cat.id && styles.activeCategoryText]}>{cat.id}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>

      <TouchableOpacity style={[styles.fab, selectedPlace && { bottom: 260 }]} onPress={async () => { 
        const loc = await Location.getCurrentPositionAsync({}); 
        setUserLocation(loc);
        mapRef.current?.animateToRegion({ ...loc.coords, latitudeDelta: 0.01, longitudeDelta: 0.01 }); 
      }}>
        <Ionicons name="location-outline" size={24} color="#007BFF" />
      </TouchableOpacity>

      <Animated.View style={[styles.infoPanel, { transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.panelHandle} />
        <View style={styles.panelHeader}>
          <View style={styles.panelTitleContainer}>
            <Text style={styles.panelTitle} numberOfLines={1}>{selectedPlace?.name}</Text>
            <View style={styles.categoryBadge}>
              <Ionicons name={getCategoryIcon(selectedPlace?.category) as any} size={12} color="#007BFF" />
              <Text style={styles.categoryBadgeText}>{selectedPlace?.category}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={closePanel} style={styles.closeButton}>
            <Ionicons name="close" size={20} color="#64748B" />
          </TouchableOpacity>
        </View>

        <View style={styles.weatherCard}>
          {loadingWeather ? (
            <ActivityIndicator color="#007BFF" />
          ) : weather?.main ? (
            <View style={styles.weatherInner}>
              <View style={styles.weatherMain}>
                <Text style={styles.weatherTemp}>{Math.round(weather.main.temp)}°C</Text>
                <Text style={styles.weatherDesc}>{weather.weather?.[0]?.description}</Text>
              </View>
              <View style={styles.weatherStats}>
                <View style={styles.statLine}><Ionicons name="water" size={14} color="#007BFF" /><Text style={styles.statVal}>{weather.main.humidity}%</Text></View>
                <View style={styles.statLine}><Ionicons name="speedometer" size={14} color="#007BFF" /><Text style={styles.statVal}>{weather.wind?.speed}m/s</Text></View>
              </View>
              <TouchableOpacity style={styles.primaryGoButton} onPress={handleGo}>
                <Ionicons name="navigate" size={20} color="#fff" />
                <Text style={styles.primaryGoText}>GO</Text>
              </TouchableOpacity>
            </View>
          ) : <Text style={styles.noWeatherData}>Weather data unavailable</Text>}
        </View>
      </Animated.View>

      {error && <View style={styles.errorToast}><Text style={styles.errorText}>{error}</Text></View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  map: { flex: 1 },
  topOverlay: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  searchBar: { backgroundColor: '#fff', marginHorizontal: 20, marginTop: 10, height: 54, borderRadius: 27, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 15, elevation: 8 },
  searchIcon: { marginRight: 12 },
  searchInput: { flex: 1, fontSize: 16, color: '#1E293B', fontWeight: '500' },
  categoriesList: { marginTop: 15 },
  categoriesContent: { paddingHorizontal: 20, paddingBottom: 10 },
  categoryChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 25, marginRight: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 3 },
  activeCategoryChip: { backgroundColor: '#007BFF' },
  categoryText: { marginLeft: 8, fontSize: 14, fontWeight: '700', color: '#475569' },
  activeCategoryText: { color: '#fff' },
  markerContainer: { backgroundColor: '#007BFF', padding: 7, borderRadius: 18, borderWidth: 2, borderColor: '#fff', elevation: 5 },
  discoveredMarker: { backgroundColor: '#EF4444' },
  selectedMarker: { backgroundColor: '#F59E0B', transform: [{ scale: 1.2 }], borderColor: '#000' },
  fab: { position: 'absolute', right: 20, bottom: 40, backgroundColor: '#fff', width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 10, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, zIndex: 99 },
  infoPanel: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopLeftRadius: 35, borderTopRightRadius: 35, padding: 25, paddingBottom: 40, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 25, elevation: 20, zIndex: 100 },
  panelHandle: { width: 40, height: 5, backgroundColor: '#E2E8F0', borderRadius: 3, alignSelf: 'center', marginBottom: 20 },
  panelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  panelTitleContainer: { flex: 1 },
  panelTitle: { fontSize: 24, fontWeight: '900', color: '#1E293B', marginBottom: 6 },
  categoryBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E6F2FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, alignSelf: 'flex-start' },
  categoryBadgeText: { fontSize: 11, fontWeight: '800', color: '#007BFF', marginLeft: 5, textTransform: 'uppercase' },
  closeButton: { backgroundColor: '#F1F5F9', width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  weatherCard: { backgroundColor: '#F8FAFC', borderRadius: 25, padding: 20, borderWidth: 1, borderColor: '#F1F5F9' },
  weatherInner: { flexDirection: 'row', alignItems: 'center' },
  weatherMain: { flex: 1.2 },
  weatherTemp: { fontSize: 36, fontWeight: '900', color: '#1E293B' },
  weatherDesc: { fontSize: 13, color: '#64748B', fontWeight: '600', textTransform: 'capitalize' },
  weatherStats: { flex: 1, gap: 8 },
  statLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statVal: { fontSize: 14, fontWeight: '700', color: '#475569' },
  primaryGoButton: { backgroundColor: '#007BFF', flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 22, borderRadius: 20, gap: 10, elevation: 5, shadowColor: '#007BFF', shadowOpacity: 0.3 },
  primaryGoText: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  noWeatherData: { textAlign: 'center', color: '#94A3B8', fontWeight: '600' },
  errorToast: { position: 'absolute', top: 120, alignSelf: 'center', backgroundColor: '#FEF2F2', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 20, borderWidth: 1, borderColor: '#FEE2E2', zIndex: 100 },
  errorText: { color: '#B91C1C', fontWeight: '700', fontSize: 13 },
});