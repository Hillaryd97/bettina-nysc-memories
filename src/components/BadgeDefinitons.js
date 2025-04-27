// BadgeDefinitions.js
export const BADGE_CATEGORIES = {
    MILESTONES: 'Milestones',
    ENTRIES: 'Journal Entries',
    ENGAGEMENT: 'App Engagement',
    TIMELINE: 'NYSC Timeline',
    QUALITY: 'Content Quality'
  };
  
  export const BADGES = [
    // Milestone Badges
    {
      id: 'first_entry',
      title: 'First Entry',
      description: 'Created your first journal entry',
      category: BADGE_CATEGORIES.MILESTONES,
      icon: 'book-open', // Assuming you'll use an icon library
      condition: (stats) => stats.entriesCount >= 1
    },
    
    // Entry Count Badges
    {
      id: 'prolific_writer_25',
      title: 'Prolific Writer I',
      description: 'Created 25 journal entries',
      category: BADGE_CATEGORIES.ENTRIES,
      icon: 'edit',
      condition: (stats) => stats.entriesCount >= 25
    },
    {
      id: 'prolific_writer_50',
      title: 'Prolific Writer II',
      description: 'Created 50 journal entries',
      category: BADGE_CATEGORIES.ENTRIES,
      icon: 'edit',
      condition: (stats) => stats.entriesCount >= 50
    },
    {
      id: 'prolific_writer_100',
      title: 'Prolific Writer III',
      description: 'Created 100 journal entries',
      category: BADGE_CATEGORIES.ENTRIES,
      icon: 'edit',
      condition: (stats) => stats.entriesCount >= 100
    },
    
    // Streak Badges
    {
      id: 'weekly_streak',
      title: 'Weekly Streak',
      description: 'Created entries for 7 consecutive days',
      category: BADGE_CATEGORIES.ENTRIES,
      icon: 'calendar',
      condition: (stats) => stats.streakDays >= 7
    },
    
    // Tag Badges
    {
      id: 'tag_master',
      title: 'Tag Master',
      description: 'Used at least 5 different tags in entries',
      category: BADGE_CATEGORIES.QUALITY,
      icon: 'tag',
      condition: (stats) => Object.keys(stats.tagsUsed).length >= 5
    },
    
    // Feature Usage Badges
    {
      id: 'search_explorer',
      title: 'Search Explorer',
      description: 'Used the search function 10 times',
      category: BADGE_CATEGORIES.ENGAGEMENT,
      icon: 'search',
      condition: (stats) => stats.searchCount >= 10
    },
    {
      id: 'data_guardian',
      title: 'Data Guardian',
      description: 'Used the export/backup feature',
      category: BADGE_CATEGORIES.ENGAGEMENT,
      icon: 'shield',
      condition: (stats) => stats.exportCount >= 1
    },
    
    // NYSC Timeline Badges
    {
      id: 'service_started',
      title: 'Service Started',
      description: 'Recorded first entry at beginning of service',
      category: BADGE_CATEGORIES.TIMELINE,
      icon: 'flag',
      condition: (stats, serviceInfo) => {
        if (!serviceInfo || !serviceInfo.startDate) return false;
        
        const serviceStartDate = new Date(serviceInfo.startDate);
        const firstEntryDate = stats.firstEntryDate ? new Date(stats.firstEntryDate) : null;
        
        if (!firstEntryDate) return false;
        
        // Check if first entry was within 14 days of service start
        const diffTime = Math.abs(firstEntryDate - serviceStartDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return diffDays <= 14;
      }
    },
    {
      id: 'halfway_mark',
      title: 'Halfway Mark',
      description: 'Reached 6 months in service',
      category: BADGE_CATEGORIES.TIMELINE,
      icon: 'clock',
      condition: (stats, serviceInfo) => {
        if (!serviceInfo || !serviceInfo.startDate) return false;
        
        const serviceStartDate = new Date(serviceInfo.startDate);
        const now = new Date();
        
        // Check if at least 6 months have passed since service start
        const sixMonthsLater = new Date(serviceStartDate);
        sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);
        
        return now >= sixMonthsLater;
      }
    },
    
    // More badges can be added here
  ];
  
  export const getBadgeById = (badgeId) => {
    return BADGES.find(badge => badge.id === badgeId);
  };
  
  export const getAvailableBadgesByCategory = () => {
    const badgesByCategory = {};
    
    Object.values(BADGE_CATEGORIES).forEach(category => {
      badgesByCategory[category] = BADGES.filter(badge => badge.category === category);
    });
    
    return badgesByCategory;
  };