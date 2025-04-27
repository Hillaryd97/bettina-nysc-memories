// BadgesScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather'; // Or your preferred icon library
import badgeService from '../services/BadgeService';

const BadgesScreen = () => {
  const [badgesByCategory, setBadgesByCategory] = useState({});
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  
  useEffect(() => {
    const loadBadges = async () => {
      try {
        const badgesData = await badgeService.getAllBadgesWithStatus();
        setBadgesByCategory(badgesData);
        
        // Get categories with at least one badge
        const cats = Object.keys(badgesData).filter(cat => badgesData[cat].length > 0);
        setCategories(cats);
        
        // Select first category by default if available
        if (cats.length > 0) {
          setSelectedCategory(cats[0]);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error loading badges:', error);
        setLoading(false);
      }
    };
    
    loadBadges();
  }, []);
  
  const renderBadge = ({ item }) => {
    const isLocked = !item.earned;
    
    return (
      <TouchableOpacity 
        style={[styles.badgeItem, isLocked && styles.lockedBadge]} 
        activeOpacity={0.7}
      >
        <View style={styles.badgeIconContainer}>
          <Icon 
            name={item.icon || 'award'} 
            size={32} 
            color={isLocked ? '#a0a0a0' : '#f29d38'} 
          />
          {isLocked && (
            <View style={styles.lockOverlay}>
              <Icon name="lock" size={16} color="#ffffff" />
            </View>
          )}
        </View>
        
        <View style={styles.badgeContent}>
          <Text style={[styles.badgeTitle, isLocked && styles.lockedText]}>
            {item.title}
          </Text>
          <Text style={[styles.badgeDescription, isLocked && styles.lockedText]}>
            {item.description}
          </Text>
          {item.earned && (
            <Text style={styles.earnedDate}>
              Earned: {new Date(item.earnedDate).toLocaleDateString()}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };
  
  const renderCategoryTab = (category) => {
    const isSelected = category === selectedCategory;
    
    return (
      <TouchableOpacity
        key={category}
        style={[styles.categoryTab, isSelected && styles.selectedCategoryTab]}
        onPress={() => setSelectedCategory(category)}
      >
        <Text style={[styles.categoryTabText, isSelected && styles.selectedCategoryTabText]}>
          {category}
        </Text>
      </TouchableOpacity>
    );
  };
  
  const getEarnedCount = (category) => {
    if (!badgesByCategory[category]) return '0/0';
    
    const total = badgesByCategory[category].length;
    const earned = badgesByCategory[category].filter(badge => badge.earned).length;
    
    return `${earned}/${total}`;
  };
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f29d38" />
        <Text style={styles.loadingText}>Loading badges...</Text>
      </View>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Achievements</Text>
      </View>
      
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScrollView}>
        <View style={styles.categoriesContainer}>
          {categories.map(renderCategoryTab)}
        </View>
      </ScrollView>
      
      {selectedCategory && (
        <View style={styles.categoryHeader}>
          <Text style={styles.categoryTitle}>{selectedCategory}</Text>
          <Text style={styles.earnedCount}>
            {getEarnedCount(selectedCategory)} earned
          </Text>
        </View>
      )}
      
      {selectedCategory && (
        <FlatList
          data={badgesByCategory[selectedCategory] || []}
          renderItem={renderBadge}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.badgesList}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};
export default BadgesScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666666',
  },
  categoriesScrollView: {
    maxHeight: 50,
    backgroundColor: '#ffffff',
  },
  categoriesContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
  },
  categoryTab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  selectedCategoryTab: {
    backgroundColor: '#f29d38',
  },
  categoryTabText: {
    fontSize: 14,
    color: '#666666',
  },
  selectedCategoryTabText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    marginTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
  },
  earnedCount: {
    fontSize: 14,
    color: '#666666',
  },
  badgesList: {
    padding: 12,
  },
  badgeItem: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  lockedBadge: {
    opacity: 0.7,
    backgroundColor: '#f7f7f7',
  },
  badgeIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f7f7f7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  lockOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeContent: {
    flex: 1,
  },
  badgeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  badgeDescription: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 6,
  },
  earnedDate: {
    fontSize: 12,
    color: '#888888',
    fontStyle: 'italic',
  },
  lockedText: {
    color: '#a0a0a0',
  },
});