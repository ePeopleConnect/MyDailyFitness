import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';

export default function About() {
  const insets = useSafeAreaInsets();
  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right }] }>
      <ThemedText type="title" style={styles.title}>
        About My Fitness
      </ThemedText>
      <ThemedText type="default" style={styles.subtitle}>
        Your journey to better health starts here.
      </ThemedText>
      <View style={styles.card}>
        <ThemedText type="default" style={styles.text}>
          My Fitness is designed to help you track, improve, and celebrate your fitness progress. Our Fitness tab provides personalized workouts, progress tracking, and motivational tips to keep you moving forward.
        </ThemedText>
        <ThemedText type="default" style={styles.text}>
          Whether you’re a beginner or a seasoned athlete, our app adapts to your needs. Explore the Fitness tab to log your activities, set goals, and monitor your achievements. Stay motivated and make every workout count!
        </ThemedText>
      </View>
      <ThemedText type="default" style={styles.footer}>
        Built with passion for a healthier you.
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    // justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f7f8fa',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#2e2e2e',
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 20,
    color: '#4a4a4a',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    boxShadow: '0px 2px 8px rgba(0,0,0,0.10)',
    elevation: 4,
    marginBottom: 24,
    width: '100%',
    maxWidth: 400,
  },
  text: {
    fontSize: 16,
    color: '#333',
    marginBottom: 12,
  },
  footer: {
    fontSize: 14,
    color: '#888',
    marginTop: 16,
    textAlign: 'center',
  },
});
