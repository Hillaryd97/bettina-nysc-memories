import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

// Constants
const COLORS = {
  primary: "#3DB389",
  primaryLight: "#E5F5EE",
  primaryDark: "#1A6B52",
  secondary: "#5FB3A9",
  background: "#F8FDFB",
  card: "#F1F9F6",
  text: "#1E3A32",
  textLight: "#4F6E64",
  textMuted: "#8A9E97",
  white: "#FFFFFF",
  black: "#0F1F1A",
  error: "#E07D6B",
  border: "rgba(0,0,0,0.05)",
};

const AboutAppScreen = ({ navigation }) => {
  const socialLinks = [
    {
      name: "TikTok",
      icon: "video", // Feather doesn't have a TikTok icon, using video instead
      url: "https://tiktok.com/@simi_hillary",
      color: "#000000", // TikTok brand color
    },

    {
      name: "Instagram",
      icon: "instagram",
      url: "https://instagram.com/simi_hillary_",
      color: "#E1306C",
    },
    {
      name: "Twitter",
      icon: "twitter",
      url: "https://twitter.com/hik_ari_",
      color: "#1DA1F2",
    },

    {
      name: "LinkedIn",
      icon: "linkedin",
      url: "https://linkedin.com/in/simidickson", // Replace with your actual LinkedIn profile
      color: "#0077B5",
    },
  ];

  const openLink = (url) => {
    Linking.openURL(url).catch((err) =>
      console.error("An error occurred", err)
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Feather name="arrow-left" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>About Bettina</Text>
          <View style={styles.headerRight} />
        </View>

        {/* App Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoIconContainer}>
            <Feather name="book-open" size={48} color={COLORS.primary} />
          </View>
          <Text style={styles.appName}>Bettina</Text>
          <Text style={styles.appTagline}>Your NYSC Memories Vault</Text>
        </View>

        {/* App Story */}
        <View style={styles.storyContainer}>
          <Text style={styles.sectionTitle}>The Story</Text>

          <Text style={styles.storyText}>
            Hiiiiii! I'm Simi. My younger sister went off to NYSC camp, and it
            gave me an idea.
          </Text>

          <Text style={styles.storyText}>
            NYSC is one of those things you look back on with nostalgia — the
            experiences, the chaos, the friends you make. So I thought, why not
            build her a journal just for her service year? A place she could
            save everything while it was still fresh.
          </Text>

          <Text style={styles.storyText}>
            I figured, if I don't make it for her, who will? (Honestly, I'm the
            best sister. 😂) And while I was at it, I realized a lot of other
            Corps Members would probably appreciate something like this too.
          </Text>

          <Text style={styles.storyText}>
            During my time, I had tons of pictures and memories... or so I
            thought. When I came back, most of it was gone. All three weeks of
            camp — erased.
          </Text>

          <Text style={styles.storyText}>
            So the app, Bettina, was born — a simple, personal vault to hold
            your memories of the service year before they slip away. And if
            you're wondering why it's named Bettina... well, I built it for her
            first.
          </Text>
        </View>

        {/* App Purpose */}
        <View style={styles.purposeContainer}>
          <Text style={styles.sectionTitle}>What Bettina Is All About</Text>

          <View style={styles.purposeItem}>
            <View style={styles.purposeIcon}>
              <Feather name="book" size={20} color={COLORS.white} />
            </View>
            <View style={styles.purposeTextContainer}>
              <Text style={styles.purposeTitle}>Save Your Journey</Text>
              <Text style={styles.purposeText}>
                Write down your little wins, the funny moments, and the memories
                you don't want to forget — all in one private space.
              </Text>
            </View>
          </View>

          <View style={styles.purposeItem}>
            <View style={styles.purposeIcon}>
              <Feather name="lock" size={20} color={COLORS.white} />
            </View>
            <View style={styles.purposeTextContainer}>
              <Text style={styles.purposeTitle}>Your Space, Your Rules</Text>
              <Text style={styles.purposeText}>
                Bettina is just for you. No likes, no judgment, no pressure —
                just your real thoughts and memories, safe and sound.
              </Text>
            </View>
          </View>

          <View style={styles.purposeItem}>
            <View style={styles.purposeIcon}>
              <Feather name="image" size={20} color={COLORS.white} />
            </View>
            <View style={styles.purposeTextContainer}>
              <Text style={styles.purposeTitle}>Hold On To The Good Stuff</Text>
              <Text style={styles.purposeText}>
                Keep all your NYSC photos in one place, so when you look back,
                you can actually *find* them this time.
              </Text>
            </View>
          </View>

          <View style={styles.purposeItem}>
            <View style={styles.purposeIcon}>
              <Feather name="sun" size={20} color={COLORS.white} />
            </View>
            <View style={styles.purposeTextContainer}>
              <Text style={styles.purposeTitle}>Grow Through It</Text>
              <Text style={styles.purposeText}>
                Reflect on everything — the hard days, the wins, the tiny
                lessons — and watch how much you've grown by the end of it.
              </Text>
            </View>
          </View>
        </View>

        {/* Connect Section */}
        <View style={styles.connectContainer}>
          <Text style={styles.sectionTitle}>Say Hi 👋🏽</Text>
          <Text style={styles.connectText}>
            Got feedback? Funny stories? Just wanna gist? Find me on social
            media — I actually read my DMs (sometimes). Also, if you like apps
            like this, I build other cool stuff too 👀 (mostly on Tiktok and
            maybe IG if the spirit leads).
          </Text>

          <View style={styles.socialLinks}>
            {socialLinks.map((link, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.socialButton, { backgroundColor: link.color }]}
                onPress={() => openLink(link.url)}
              >
                <Feather name={link.icon} size={20} color={COLORS.white} />
                <Text style={styles.socialButtonText}>{link.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Made with 💚 for every Corps Member
          </Text>
          <Text style={styles.copyrightText}>
            © {new Date().getFullYear()} Bettina App
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
  },
  headerRight: {
    width: 40,
  },
  logoContainer: {
    alignItems: "center",
    paddingVertical: 25,
    marginBottom: 25,
  },
  logoIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 4,
  },
  appName: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.primary,
    marginBottom: 5,
  },
  appTagline: {
    fontSize: 16,
    color: COLORS.textLight,
  },
  storyContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 25,
    padding: 20,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 15,
  },
  storyText: {
    fontSize: 15,
    color: COLORS.textLight,
    lineHeight: 22,
    marginBottom: 15,
  },
  purposeContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 25,
    padding: 20,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  purposeItem: {
    flexDirection: "row",
    marginBottom: 20,
    alignItems: "flex-start",
  },
  purposeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  purposeTextContainer: {
    flex: 1,
  },
  purposeTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 5,
  },
  purposeText: {
    fontSize: 14,
    color: COLORS.textLight,
    lineHeight: 20,
  },
  connectContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 25,
    padding: 20,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  connectText: {
    fontSize: 15,
    color: COLORS.textLight,
    marginBottom: 20,
  },
  socialLinks: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  socialButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 12,
    marginBottom: 12,
    width: "48%",
  },
  socialButtonText: {
    color: COLORS.white,
    marginLeft: 8,
    fontWeight: "600",
  },
  footer: {
    alignItems: "center",
    marginVertical: 25,
  },
  footerText: {
    fontSize: 15,
    color: COLORS.textLight,
    marginBottom: 5,
  },
  copyrightText: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
});

export default AboutAppScreen;
