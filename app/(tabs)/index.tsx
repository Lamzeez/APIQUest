import React from 'react';
import { StyleSheet, Text, View, ImageBackground, TouchableOpacity, Dimensions, StatusBar } from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?q=80&w=2070&auto=format&fit=crop' }}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.darkOverlay} />
        
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Ionicons name="location" size={24} color="#fff" />
              <Text style={styles.logoText}>MATI CITY</Text>
            </View>
          </View>

          <View style={styles.heroContent}>
            <Text style={styles.welcomeText}>Welcome to</Text>
            <Text style={styles.mainTitle}>The City of {"\n"}Dazzling Sunsets</Text>
            <View style={styles.badgeContainer}>
              <View style={styles.badge}>
                <Ionicons name="sunny" size={14} color="#FFD700" />
                <Text style={styles.badgeText}>Tropical Paradise</Text>
              </View>
              <View style={styles.badge}>
                <Ionicons name="water" size={14} color="#00E5FF" />
                <Text style={styles.badgeText}>Surfing Destination</Text>
              </View>
            </View>
          </View>

          <View style={styles.actionCard}>
            <Text style={styles.cardDescription}>
              Explore the hidden gems of Mati City, from the white sands of Dahican to the historical Subangan Museum.
            </Text>
            
            <View style={styles.buttonRow}>
              <Link href="/map" asChild>
                <TouchableOpacity style={styles.primaryButton}>
                  <View style={styles.buttonIconContainer}>
                    <Ionicons name="map" size={20} color="#007BFF" />
                  </View>
                  <Text style={styles.primaryButtonText}>Explore Map</Text>
                </TouchableOpacity>
              </Link>
            </View>

            <Link href="/weather" asChild>
              <TouchableOpacity style={styles.secondaryButton}>
                <Ionicons name="partly-sunny" size={20} color="#fff" />
                <Text style={styles.secondaryButtonText}>Check Live Weather</Text>
                <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>
            </Link>
          </View>
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  backgroundImage: {
    width: width,
    height: height,
  },
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 25,
    justifyContent: 'space-between',
  },
  header: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  logoText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
    marginLeft: 8,
  },
  heroContent: {
    marginTop: 40,
  },
  welcomeText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 20,
    fontWeight: '500',
    marginBottom: 5,
  },
  mainTitle: {
    color: '#fff',
    fontSize: 42,
    fontWeight: '800',
    lineHeight: 48,
  },
  badgeContainer: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 10,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 5,
  },
  actionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    padding: 25,
    borderRadius: 30,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backdropFilter: 'blur(10px)', // For web support, though RN doesn't support blur natively without extra libs
  },
  cardDescription: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 25,
    textAlign: 'center',
  },
  buttonRow: {
    marginBottom: 15,
  },
  primaryButton: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 20,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  buttonIconContainer: {
    backgroundColor: '#E6F2FF',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  primaryButtonText: {
    color: '#333',
    fontSize: 18,
    fontWeight: 'bold',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginLeft: 12,
  },
});