// FitnessApp.tsx
import { FontAwesome } from "@expo/vector-icons";
import { useAudioPlayer } from "expo-audio";
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Exercise = {
  name: string;
  duration: number;
  description: string;
  reps?: string | null;
};

const warmupExercises: Exercise[] = [
  { 
    name: "Marching in Place", 
    duration: 60, 
    description: (() => {
      const details = renderExerciseDetails("Marching in Place");
      return [
        ...details.instructions,
        "Tips:",
        ...details.tips,
        "Modifications:",
        ...details.modifications
      ].join("\n");
    })()
  },
  { 
    name: "Arm Circles Forward", 
    duration: 30, 
    description: (() => {
      const details = renderExerciseDetails("Arm Circles Forward");
      return [
        ...details.instructions,
        "Tips:",
        ...details.tips,
        "Modifications:",
        ...details.modifications
      ].join("\n");
    })()
  },
  { 
    name: "Arm Circles Backward", 
    duration: 30, 
    description: (() => {
      const details = renderExerciseDetails("Arm Circles Backward");
      return [
        ...details.instructions,
        "Tips:",
        ...details.tips,
        "Modifications:",
        ...details.modifications
      ].join("\n");
    })()
  },
  { 
    name: "Shoulder Rolls Backward", 
    duration: 20, 
    description: (() => {
      const details = renderExerciseDetails("Shoulder Rolls Backward");
      return [
        ...details.instructions,
        "Tips:",
        ...details.tips,
        "Modifications:",
        ...details.modifications
      ].join("\n");
    })()
  },
  { 
    name: "Shoulder Rolls Forward", 
    duration: 20, 
    description: (() => {
      const details = renderExerciseDetails("Shoulder Rolls Forward");
      return [
        ...details.instructions,
        "Tips:",
        ...details.tips,
        "Modifications:",
        ...details.modifications
      ].join("\n");
    })()
  },
  { 
    name: "Torso Twists", 
    duration: 60, 
    description: (() => {
      const details = renderExerciseDetails("Torso Twists");
      return [
        ...details.instructions,
        "Tips:",
        ...details.tips,
        "Modifications:",
        ...details.modifications
      ].join("\n");
    })()
  },
  { 
    name: "Leg Swings - Right Leg", 
    duration: 30, 
    description: (() => {
      const details = renderExerciseDetails("Leg Swings - Right Leg");
      return [
        ...details.instructions,
        "Tips:",
        ...details.tips,
        "Modifications:",
        ...details.modifications
      ].join("\n");
    })()
  },
  { 
    name: "Leg Swings - Left Leg", 
    duration: 30, 
    description: (() => {
      const details = renderExerciseDetails("Leg Swings - Left Leg");
      return [
        ...details.instructions,
        "Tips:",
        ...details.tips,
        "Modifications:",
        ...details.modifications
      ].join("\n");
    })()
  }
];
const workoutExercises: Exercise[] = [
  { 
    name: "Modified Plank", 
    duration: 20, 
    reps: "15-20 seconds hold",
    description: (() => {
      const details = renderExerciseDetails("Modified Plank");
      return [
        ...details.instructions,
        "Tips:",
        ...details.tips,
        "Modifications:",
        ...details.modifications
      ].join("\n");
    })()
  },
  { 
    name: "Modified Side Plank - Right", 
    duration: 15, 
    reps: "15 seconds hold",
    description: (() => {
      const details = renderExerciseDetails("Modified Side Plank - Right");
      return [
        ...details.instructions,
        "Tips:",
        ...details.tips,
        "Modifications:",
        ...details.modifications
      ].join("\n");
    })()
  },
  { 
    name: "Modified Side Plank - Left", 
    duration: 15, 
    reps: "15 seconds hold",
    description: (() => {
      const details = renderExerciseDetails("Modified Side Plank - Left");
      return [
        ...details.instructions,
        "Tips:",
        ...details.tips,
        "Modifications:",
        ...details.modifications
      ].join("\n");
    })()
  },
  { 
    name: "Chair Hip Hinge", 
    duration: 45, 
    reps: "8-10 reps",
    description: (() => {
      const details = renderExerciseDetails("Chair Hip Hinge");
      return [
        ...details.instructions,
        "Tips:",
        ...details.tips,
        "Modifications:",
        ...details.modifications
      ].join("\n");
    })()
  },
  { 
    name: "Wall Push-ups", 
    duration: 60, 
    reps: "8-12 reps",
    description: (() => {
      const details = renderExerciseDetails("Wall Push-ups");
      return [
        ...details.instructions,
        "Tips:",
        ...details.tips,
        "Modifications:",
        ...details.modifications
      ].join("\n");
    })()
  },
  { 
    name: "Horse Stance", 
    duration: 30, 
    reps: "20-30 seconds hold",
    description: (() => {
      const details = renderExerciseDetails("Horse Stance");
      return [
        ...details.instructions,
        "Tips:",
        ...details.tips,
        "Modifications:",
        ...details.modifications
      ].join("\n");
    })()
  },
  { 
    name: "Dumbbell Hip Hinge", 
    duration: 60, 
    reps: "8-10 reps",
    description: (() => {
      const details = renderExerciseDetails("Dumbbell Hip Hinge");
      return [
        ...details.instructions,
        "Tips:",
        ...details.tips,
        "Modifications:",
        ...details.modifications
      ].join("\n");
    })()
  }
];
const cooldownExercises: Exercise[] = [
  { 
    name: "Hamstring Stretch - Right", 
    duration: 30, 
    description: (() => {
      const details = renderExerciseDetails("Hamstring Stretch - Right");
      return [
        ...details.instructions,
        "Tips:",
        ...details.tips,
        "Modifications:",
        ...details.modifications
      ].join("\n");
    })(),
    reps: null 
  },
  { 
    name: "Hamstring Stretch - Left", 
    duration: 30, 
    description: (() => {
      const details = renderExerciseDetails("Hamstring Stretch - Left");
      return [
        ...details.instructions,
        "Tips:",
        ...details.tips,
        "Modifications:",
        ...details.modifications
      ].join("\n");
    })(),
    reps: null 
  },
  { 
    name: "Quad Stretch - Right", 
    duration: 30, 
    description: (() => {
      const details = {
        instructions: [
          "Instructions:",
          "1. Hold onto a wall or sturdy surface for balance",
          "2. Bend your right knee and grab your right foot behind you",
          "3. Gently pull your heel toward your glute",
          "4. Keep your knees close together",
          "5. Feel the stretch in the front of your thigh",
          "6. Hold for 30 seconds, then repeat on left side",
        ],
        tips: [
          "Don't pull too hard - gentle pressure is enough",
          "Keep your standing leg slightly bent",
          "If you can't reach your foot, use a towel to help",
        ],
        modifications: [
          "Lie on your side if standing balance is difficult",
          "Use a towel around your ankle if you can't reach your foot",
          "Hold onto a wall for better balance",
        ],
      };
      return [
        ...details.instructions,
        "Tips:",
        ...details.tips,
        "Modifications:",
        ...details.modifications
      ].join("\n");
    })(),
    reps: null 
  },
  { 
    name: "Quad Stretch - Left", 
    duration: 30, 
    description: (() => {
      const details = {
        instructions: [
          "Instructions:",
          "1. Hold onto a wall or sturdy surface for balance",
          "2. Bend your right knee and grab your right foot behind you",
          "3. Gently pull your heel toward your glute",
          "4. Keep your knees close together",
          "5. Feel the stretch in the front of your thigh",
          "6. Hold for 30 seconds, then repeat on left side",
        ],
        tips: [
          "Don't pull too hard - gentle pressure is enough",
          "Keep your standing leg slightly bent",
          "If you can't reach your foot, use a towel to help",
        ],
        modifications: [
          "Lie on your side if standing balance is difficult",
          "Use a towel around your ankle if you can't reach your foot",
          "Hold onto a wall for better balance",
        ],
      };
      return [
        ...details.instructions,
        "Tips:",
        ...details.tips,
        "Modifications:",
        ...details.modifications
      ].join("\n");
    })(),
    reps: null 
  },
  { 
    name: "Chest Stretch", 
    duration: 30, 
    description: (() => {
      const details = {
        instructions: [
          "Instructions:",
          "1. Stand in a doorway with your forearms on the door frame",
          "2. Place elbows just below shoulder height",
          "3. Step one foot forward gently",
          "4. Feel the stretch across your chest and front shoulders",
          "5. Hold the position for 30 seconds",
        ],
        tips: [
          "Don't force the stretch - gentle pressure is effective",
          "Keep your head in neutral position",
          "Breathe deeply while stretching",
        ],
        modifications: [
          "Place hands on wall instead of in doorway",
          "Adjust elbow height for comfort",
          "Step forward less if stretch is too intense",
        ],
      };
      return [
        ...details.instructions,
        "Tips:",
        ...details.tips,
        "Modifications:",
        ...details.modifications
      ].join("\n");
    })(),
    reps: null 
  },
  { 
    name: "Deep Breathing", 
    duration: 60, 
    description: (() => {
      const details = {
        instructions: [
          "Instructions:",
          "1. Sit or stand quietly in a comfortable position",
          "2. Place one hand on your chest, one on your belly",
          "3. Inhale slowly through your nose for 4 counts",
          "4. Feel your belly expand more than your chest",
          "5. Exhale slowly through your mouth for 6 counts",
          "6. Repeat for 5 complete breath cycles",
        ],
        tips: [
          "Focus on making your exhale longer than your inhale",
          "This helps activate your body's relaxation response",
          "Let your heart rate gradually return to normal",
        ],
        modifications: [],
      };
      return [
        ...details.instructions,
        "Tips:",
        ...details.tips,
        "Modifications:",
        ...details.modifications
      ].join("\n");
    })(),
    reps: null 
  }
];

export default function FitnessApp() {
  const insets = useSafeAreaInsets();
  const [currentPhase, setCurrentPhase] = useState<"warmup" | "workout" | "cooldown" | "complete">("warmup");
  const [currentExercise, setCurrentExercise] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [isRunning, setIsRunning] = useState(false);
  const [totalSets, setTotalSets] = useState(1);
  const [isResting, setIsResting] = useState(false);
  const [autoStart, setAutoStart] = useState(true);

  const player = useAudioPlayer(require("../../assets/beep.mp3"));
  const playSound = React.useCallback(() => {
    try {
      player.play();
    } catch (error) {
      console.warn("Failed to play sound", error);
    }
  }, [player]);

  const getCurrentExercises = React.useCallback(() => {
    switch (currentPhase) {
      case "warmup": return warmupExercises;
      case "workout": return workoutExercises;
      case "cooldown": return cooldownExercises;
      default: return [];
    }
  }, [currentPhase]);

  const getCurrentExercise = () => {
    const exercise = getCurrentExercises()[currentExercise] || null;
    return exercise ? { ...exercise, reps: exercise.reps || null } : null;
  };

  const moveToNextPhase = React.useCallback(() => {
    if (currentPhase === "warmup") {
      setCurrentPhase("workout");
      setCurrentExercise(0);
      setCurrentSet(1);
      setTimeRemaining(workoutExercises[0].duration);
    } else if (currentPhase === "workout") {
      setCurrentPhase("cooldown");
      setCurrentExercise(0);
      setCurrentSet(1);
      setTimeRemaining(cooldownExercises[0].duration);
    } else {
      setCurrentPhase("complete");
    }
    setIsRunning(false);
    setIsResting(false);
  }, [currentPhase]);

  const handleExerciseComplete = React.useCallback(() => {
    const exercises = getCurrentExercises();
    // Only workout phase uses multiple sets
    const maxSets = currentPhase === "workout" ? totalSets : 1;
    if (currentExercise < exercises.length - 1) {
      setCurrentExercise(prev => prev + 1);
      setTimeRemaining(exercises[currentExercise + 1].duration);
    } else {
      // End of set
      if (currentSet < maxSets) {
        setCurrentSet(prev => prev + 1);
        setCurrentExercise(0);
        const nextExercises = getCurrentExercises();
        setTimeRemaining(nextExercises[0]?.duration || 0);
      } else {
        moveToNextPhase();
      }
    }
  }, [currentExercise, getCurrentExercises, moveToNextPhase, currentSet, totalSets, currentPhase]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isRunning && timeRemaining > 0) {
      interval = setInterval(() => setTimeRemaining(t => t - 1), 1000);
    } else if (isRunning && timeRemaining === 0) {
      playSound();
      setIsRunning(false);
      handleExerciseComplete();
      if (autoStart) {
        setIsRunning(true);
      }
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, timeRemaining, handleExerciseComplete, playSound, autoStart]);

  const resetWorkout = () => {
    setCurrentPhase("warmup");
    setCurrentExercise(0);
    setCurrentSet(1);
    setTimeRemaining(warmupExercises[0].duration);
    setIsRunning(false);
    setIsResting(false);
    setTotalSets(1);
  };

  const exercise = getCurrentExercise();

  if (currentPhase === "complete") {
    return (
      <View style={styles.containerCenter}>
        <FontAwesome name="trophy" size={80} color="#22c55e" />
        <Text style={styles.title}>Congratulations!</Text>
        <Text style={styles.text}>You&apos;ve completed My Daily Fitness Routine!</Text>
        <TouchableOpacity style={styles.button} onPress={resetWorkout}>
          <FontAwesome name="repeat" size={20} color="#fff" />
          <Text style={styles.buttonText}> Do It Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }] }>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Daily Fitness</Text>
        <View style={styles.row}>
          <FontAwesome name="users" size={16} color="#000" />
          <Text style={styles.text}> Workout Sets: {totalSets}</Text>
          <View style={{ flexDirection: 'row', marginLeft: 18 }}>
            <TouchableOpacity onPress={() => setTotalSets(Math.max(1, totalSets - 1))} style={{ marginHorizontal: 8 }}>
              <FontAwesome name="minus" size={18} color="#2563eb" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setTotalSets(totalSets + 1)} style={{ marginHorizontal: 8 }}>
              <FontAwesome name="plus" size={18} color="#2563eb" />
            </TouchableOpacity>
          </View>
        </View>
        {currentPhase === "workout" && (
          <View style={styles.row}>
            <FontAwesome name="list-ol" size={16} color="#000" />
            <Text style={styles.text}> Workout Current Set: {currentSet}</Text>
          </View>
        )}
        <View style={styles.row}>
          <Switch value={autoStart} onValueChange={setAutoStart} />
          <Text style={styles.text}> Auto-start</Text>
        </View>
      </View>

      {/* Timer */}
      <View style={[styles.timerBox, { width: '100%' }]}> 
        {/* Exercise Info (simple text) */}
        <View style={styles.exerciseTypeHighlight}>
          <Text style={styles.exerciseTypeText}>
            {currentPhase.charAt(0).toUpperCase() + currentPhase.slice(1)} Exercise
          </Text>
        </View>
        {exercise && (
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 2 }}>{exercise.name}</Text>
        )}
        <Text style={{ fontSize: 15, color: '#374151', marginBottom: 8 }}>
          Exercise {currentExercise + 1} of {getCurrentExercises().length}
        </Text>
        <Text style={styles.timer}>{`${Math.floor(timeRemaining / 60)}:${(timeRemaining % 60).toString().padStart(2, "0")}`}</Text>
        <View style={styles.row}>
          <FontAwesome name="clock-o" size={16} color="#000" />
          <Text style={styles.text}>{isResting ? "Rest Time" : "Exercise Time"}</Text>
        </View>
      </View>

      {/* Exercise Info */}
      <ScrollView style={{ flex: 1, marginBottom: 20 }}>
        <View style={[styles.exerciseBox, { width: '100%' }]}> 
          {exercise && (
            <>
              <Text style={styles.exerciseName}>{exercise.name}</Text>
              {exercise.reps && <Text style={styles.text}>Target: {exercise.reps}</Text>}
              {/* Enhanced section rendering: headers with icons, bullet lists for content */}
              {(() => {
                // Helper to extract section text and split into lines
                const getSectionLines = (startIdx: number, endIdx: number) => {
                  if (startIdx === -1) return [];
                  const section = exercise.description.substring(startIdx, endIdx).replace(/^(Instructions:|Tips:|Modifications:)/, "").trim();
                  return section.split(/\n/).filter(line => line.trim());
                };
                // Find indices for each section
                const instructionsIndex = exercise.description.indexOf("Instructions:");
                const tipsIndex = exercise.description.indexOf("Tips:");
                const modsIndex = exercise.description.indexOf("Modifications:");
                // Find boundaries
                const tipsStart = tipsIndex !== -1 ? tipsIndex : exercise.description.length;
                const modsStart = modsIndex !== -1 ? modsIndex : exercise.description.length;
                return (
                  <>
                    {instructionsIndex !== -1 && (
                      <>
                        <View style={styles.sectionHeaderRow}>
                          <FontAwesome name="info-circle" size={18} color="#2563eb" style={{ marginRight: 4, marginTop: 2 }} />
                          <Text style={styles.instructions}>Instructions:</Text>
                        </View>
                        <View style={styles.bulletList}>
                          {getSectionLines(instructionsIndex, tipsStart).map((line, idx) => (
                            <Text key={idx} style={styles.bulletItem}>• {line.replace(/^\d+\.\s*/, "")}</Text>
                          ))}
                        </View>
                      </>
                    )}
                    {tipsIndex !== -1 && (
                      <>
                        <View style={styles.sectionHeaderRow}>
                          <FontAwesome name="lightbulb-o" size={18} color="#22c55e" style={{ marginRight: 4, marginTop: 2 }} />
                          <Text style={styles.tips}>Tips:</Text>
                        </View>
                        <View style={styles.bulletList}>
                          {getSectionLines(tipsIndex, modsStart).map((line, idx) => (
                            <Text key={idx} style={styles.bulletItem}>• {line}</Text>
                          ))}
                        </View>
                      </>
                    )}
                    {modsIndex !== -1 && (
                      <>
                        <View style={styles.sectionHeaderRow}>
                          <FontAwesome name="wrench" size={18} color="#ef4444" style={{ marginRight: 4, marginTop: 2 }} />
                          <Text style={styles.modifications}>Modifications:</Text>
                        </View>
                        <View style={styles.bulletList}>
                          {getSectionLines(modsIndex, exercise.description.length).map((line, idx) => (
                            <Text key={idx} style={styles.bulletItem}>• {line}</Text>
                          ))}
                        </View>
                      </>
                    )}
                  </>
                );
              })()}
            </>
          )}
        </View>
      </ScrollView>

      {/* Controls */}
      <View style={[styles.controls, { paddingBottom: (insets.bottom || 20) + 24 }] }>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: isRunning ? "#ef4444" : "#22c55e" }]}
          onPress={() => setIsRunning(!isRunning)}
        >
          {isRunning ? <FontAwesome name="pause" size={20} color="#fff" /> : <FontAwesome name="play" size={20} color="#fff" />}
          <Text style={styles.buttonText}>{isRunning ? "Pause" : "Start"}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.buttonGray} onPress={handleExerciseComplete}>
          <FontAwesome name="fast-forward" size={20} color="#000" />
          <Text style={{ fontSize: 17 }}> Skip</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.buttonGray} onPress={resetWorkout}>
          <FontAwesome name="repeat" size={20} color="#000" />
          <Text style={{ fontSize: 17 }}> Reset</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  exerciseTypeHighlight: {
    backgroundColor: '#dbeafe',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 6,
    alignSelf: 'center',
    boxShadow: '0px 2px 8px rgba(37,99,235,0.08)',
  },
  exerciseTypeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2563eb',
    letterSpacing: 1,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  // ...existing code...
  container: { flex: 1, padding: 16, backgroundColor: "#f9fafb", marginTop: 40 },
  containerCenter: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#f9fafb" },
  header: {
    backgroundColor: "#f8fafc",
    padding: 24,
    borderRadius: 18,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: "#d1d5db",
    boxShadow: "0px 4px 12px rgba(0,0,0,0.10)",
    elevation: 6,
  },
  headerTitle: { fontSize: 25, fontWeight: "bold" },
  row: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  text: { fontSize: 15 },
  timerBox: {
    backgroundColor: "#f8fafc",
    padding: 28,
    borderRadius: 18,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: "#d1d5db",
    minHeight: 120,
    boxShadow: "0px 4px 12px rgba(0,0,0,0.10)",
    elevation: 6,
    alignItems: "center",
  },
  timer: { fontSize: 49, fontWeight: "bold" },
  exerciseBox: {
    flex: 1,
    backgroundColor: "#f8fafc",
    padding: 28,
    borderRadius: 18,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: "#d1d5db",
    minHeight: 220,
    boxShadow: "0px 4px 12px rgba(0,0,0,0.10)",
    elevation: 6,
  },
  exerciseName: { fontSize: 23, fontWeight: "bold", marginBottom: 8, color: "#111827" },
  controls: { flexDirection: "row", justifyContent: "space-around", marginTop: "auto", paddingBottom: 20 },
  button: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 8, backgroundColor: "#2563eb", marginTop: 16, height: 48 },
  buttonGray: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 8, backgroundColor: "#e5e7eb", height: 48, marginTop: 16 },
  buttonText: { color: "#fff", marginLeft: 8, fontSize: 16 },
  title: { fontSize: 25, fontWeight: "bold", marginBottom: 8 },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", marginBottom: 2 },
  instructions: { fontSize: 17, fontWeight: "bold", color: "#2563eb", marginTop: 16 },
  tips: { fontSize: 17, fontWeight: "bold", color: "#22c55e", marginTop: 16 },
  modifications: { fontSize: 17, fontWeight: "bold", color: "#ef4444", marginTop: 16 },
  bulletList: { marginLeft: 16, marginBottom: 8 },
  bulletItem: { fontSize: 16, color: "#222", marginBottom: 2 },
});

function renderExerciseDetails(name: string): { instructions: string[]; tips: string[]; modifications: string[] } {
  const detailsMap: Record<string, { instructions: string[]; tips: string[]; modifications: string[] }> = {
    "Marching in Place": {
      instructions: [
        "1. Stand tall with your feet hip-width apart",
        "2. Lift your knees gently, bringing them up towards your chest",
        "3. Swing your arms naturally in opposition to your legs",
        "4. Maintain a straight posture and engage your core",
        "5. March in place for the desired duration",
        "6. Remember to breathe deeply and steadily",
      ],
      tips: [
        "Focus on good posture throughout",
        "Start slowly and gradually increase pace",
        "Breathe naturally and steadily",
      ],
      modifications: [
        "If balance is an issue, hold onto a sturdy surface",
        "March at a slower pace if needed",
      ],
    },
    "Arm Circles Forward": {
      instructions: [
        "1. Stand with your feet shoulder-width apart",
        "2. Extend your arms out to the sides at shoulder height",
        "3. Make small circles with your arms, gradually increasing the size",
        "4. Keep your elbows slightly bent and wrists relaxed",
        "5. Continue for the specified number of repetitions or time",
        "6. Reverse the direction of the circles after completing the set",
      ],
      tips: [
        "Keep movements controlled to avoid strain",
        "Engage your core for better stability",
      ],
      modifications: [
        "Perform seated if standing is uncomfortable",
        "Use light weights for added resistance",
      ],
    },
    "Arm Circles Backward": {
      instructions: [
        "1. Stand with your feet shoulder-width apart",
        "2. Extend your arms out to the sides at shoulder height",
        "3. Make small circles with your arms, gradually increasing the size",
        "4. Keep your elbows slightly bent and wrists relaxed",
        "5. Continue for the specified number of repetitions or time",
        "6. Reverse the direction of the circles after completing the set",
      ],
      tips: [
        "Focus on smooth and controlled movements",
        "Engage your shoulders and back muscles",
      ],
      modifications: [
        "Perform seated if standing is uncomfortable",
        "Reduce the range of motion if experiencing discomfort",
      ],
    },
    "Shoulder Rolls Backward": {
      instructions: [
        "1. Stand tall with your feet shoulder-width apart",
        "2. Relax your shoulders and let your arms hang naturally",
        "3. Slowly roll your shoulders backward in a circular motion",
        "4. Focus on a full range of motion",
        "5. Repeat for the desired duration or repetitions",
      ],
      tips: [
        "Keep movements slow and controlled",
        "Avoid shrugging your shoulders too high",
      ],
      modifications: [
        "Perform seated if standing is uncomfortable",
        "Reduce the range of motion if experiencing discomfort",
      ],
    },
    "Shoulder Rolls Forward": {
      instructions: [
        "1. Stand tall with your feet shoulder-width apart",
        "2. Relax your shoulders and let your arms hang naturally",
        "3. Slowly roll your shoulders forward in a circular motion",
        "4. Focus on a full range of motion",
        "5. Repeat for the desired duration or repetitions",
      ],
      tips: [
        "Keep movements slow and controlled",
        "Avoid shrugging your shoulders too high",
      ],
      modifications: [
        "Perform seated if standing is uncomfortable",
        "Reduce the range of motion if experiencing discomfort",
      ],
    },
    "Torso Twists": {
      instructions: [
        "1. Stand with your feet shoulder-width apart",
        "2. Place your hands on your hips or extend your arms out to the sides",
        "3. Slowly twist your torso to the right, keeping your hips facing forward",
        "4. Return to the center and twist to the left",
        "5. Continue alternating sides for the desired duration",
      ],
      tips: [
        "Engage your core muscles for stability",
        "Move smoothly without jerking",
      ],
      modifications: [
        "Perform seated if standing is uncomfortable",
        "Reduce the range of motion if experiencing discomfort",
      ],
    },
    "Leg Swings - Right Leg": {
      instructions: [
        "1. Stand tall and hold onto a sturdy surface for balance",
        "2. Swing your right leg forward and backward in a controlled motion",
        "3. Keep your core engaged and your upper body steady",
        "4. Repeat for the desired duration or repetitions",
      ],
      tips: [
        "Start with small swings and gradually increase the range",
        "Focus on maintaining balance",
      ],
      modifications: [
        "Reduce the range of motion if needed",
        "Perform slower swings for better control",
      ],
    },
    "Leg Swings - Left Leg": {
      instructions: [
        "1. Stand tall and hold onto a sturdy surface for balance",
        "2. Swing your left leg forward and backward in a controlled motion",
        "3. Keep your core engaged and your upper body steady",
        "4. Repeat for the desired duration or repetitions",
      ],
      tips: [
        "Start with small swings and gradually increase the range",
        "Focus on maintaining balance",
      ],
      modifications: [
        "Reduce the range of motion if needed",
        "Perform slower swings for better control",
      ],
    },
    "Modified Plank": {
      instructions: [
        "1. Start on hands and knees",
        "2. Place your forearms on the floor with elbows directly under shoulders",
        "3. Walk your knees back until your body forms a straight line from head to knees",
        "4. Engage your core muscles - pull belly button towards spine",
        "5. Hold position without letting hips sag",
      ],
      tips: [
        "Quality over quantity - maintain proper form",
        "Breathe normally while holding the position",
        "If it gets too difficult, take a quick break and continue",
      ],
      modifications: [
        "Start with shorter holds (10 seconds) and build up",
        "Keep knees on ground for modified version",
      ],
    },
    "Modified Side Plank - Right": {
      instructions: [
        "1. Lie on your right side with your legs extended",
        "2. Prop up your upper body on your right forearm",
        "3. Lift your hips off the ground, creating a straight line from head to feet",
        "4. Hold the position, engaging your obliques",
        "5. For modification, bend your knees and keep them on the ground",
      ],
      tips: [
        "Keep your neck in a neutral position",
        "Avoid letting your hips sag",
      ],
      modifications: [
        "Perform with knees on the ground for an easier variation",
        "Reduce the hold time and gradually increase",
      ],
    },
    "Modified Side Plank - Left": {
      instructions: [
        "1. Lie on your left side with your legs extended",
        "2. Prop up your upper body on your left forearm",
        "3. Lift your hips off the ground, creating a straight line from head to feet",
        "4. Hold the position, engaging your obliques",
        "5. For modification, bend your knees and keep them on the ground",
      ],
      tips: [
        "Keep your neck in a neutral position",
        "Avoid letting your hips sag",
      ],
      modifications: [
        "Perform with knees on the ground for an easier variation",
        "Reduce the hold time and gradually increase",
      ],
    },
    "Chair Hip Hinge": {
      instructions: [
        "1. Stand in front of a sturdy chair, facing away from it",
        "2. Keep feet shoulder-width apart",
        "3. Maintain chest up and back straight",
        "4. Push your hips backward like closing a car door with your behind",
        "5. Slowly lower until you just touch the seat of the chair",
        "6. Don't sit down and relax - immediately push through heels to stand",
        "7. Squeeze glutes at the top of the movement",
      ],
      tips: [
        "Think 'hips back first' before bending knees",
        "Keep most of your weight on your heels",
        "This teaches proper lifting mechanics",
      ],
      modifications: [
        "Use a higher surface if chair is too low",
        "Place hands on hips for better balance",
        "Start with partial range of motion",
      ],
    },
    "Wall Push-ups": {
      instructions: [
        "1. Stand facing a clear wall, about arm's length away",
        "2. Place palms on wall, slightly wider than shoulders",
        "3. Keep body in straight line from head to heels",
        "4. Bend elbows and slowly bring chest toward wall",
        "5. Pause briefly when chest nearly touches wall",
        "6. Push back to starting position with control",
      ],
      tips: [
        "Keep your core engaged throughout the movement",
        "Don't let your hips sag or pike up",
        "Control the movement - don't bounce off the wall",
      ],
      modifications: [
        "Stand closer to wall to make easier",
        "Stand further from wall to make harder",
        "Focus on partial range of motion if needed",
      ],
    },
    "Horse Stance": {
      instructions: [
        "1. Stand with feet wider than shoulder-width apart",
        "2. Point toes slightly outward",
        "3. Bend knees and sink hips down like sitting in a wide, low chair",
        "4. Keep back straight and chest up",
        "5. Only go as low as comfortable for your knees",
        "6. Hold the position while breathing normally",
      ],
      tips: [
        "Imagine sitting back into an invisible chair",
        "Keep your weight evenly distributed on both feet",
        "Focus on your breathing to help maintain the hold",
      ],
      modifications: [
        "Hold onto back of chair for balance support",
        "Don't go as low if knees are uncomfortable",
        "Start with shorter holds and build up",
      ],
    },
    "Dumbbell Hip Hinge": {
      instructions: [
        "1. Hold one household 'dumbbell' in each hand or one larger item with both hands",
        "2. Stand with feet shoulder-width apart",
        "3. Keep slight bend in knees, but don't squat",
        "4. Push hips straight back, keeping back flat",
        "5. Allow weights to slide down front of thighs",
        "6. Go only as low as you can while keeping back straight",
        "7. Drive hips forward to return to standing, squeezing glutes",
      ],
      tips: [
        "Start light - two cans of soup or water bottles",
        "Feel the stretch in your hamstrings",
        "Keep the weights close to your body throughout",
      ],
      modifications: [
        "Start with no weight to master the movement",
        "Use lighter objects if form breaks down",
        "Reduce range of motion if hamstrings are tight",
      ],
    },
    "Hamstring Stretch - Right": {
      instructions: [
        "1. Sit on the edge of a sturdy chair",
        "2. Extend one leg straight out with heel on the floor",
        "3. Keep the other foot flat on the ground",
        "4. Sit up tall and gently lean forward from your hips",
        "5. Feel the stretch in the back of your extended thigh",
        "6. Hold for 30 seconds, then switch legs",
      ],
      tips: [
        "Don't bounce - hold the stretch steady",
        "Only lean forward until you feel a gentle stretch",
        "Keep your back straight, don't round it",
      ],
      modifications: [],
    },
    "Hamstring Stretch - Left": {
      instructions: [
        "1. Sit on the edge of a sturdy chair",
        "2. Extend one leg straight out with heel on the floor",
        "3. Keep the other foot flat on the ground",
        "4. Sit up tall and gently lean forward from your hips",
        "5. Feel the stretch in the back of your extended thigh",
        "6. Hold for 30 seconds, then switch legs",
      ],
      tips: [
        "Don't bounce - hold the stretch steady",
        "Only lean forward until you feel a gentle stretch",
        "Keep your back straight, don't round it",
      ],
      modifications: [],
    },
    "Quad Stretch - Right": {
      instructions: [
        "Instructions:",
        "1. Hold onto a wall or sturdy surface for balance",
        "2. Bend your right knee and grab your right foot behind you",
        "3. Gently pull your heel toward your glute",
        "4. Keep your knees close together",
        "5. Feel the stretch in the front of your thigh",
        "6. Hold for 30 seconds, then repeat on left side",
      ],
      tips: [
        "Don't pull too hard - gentle pressure is enough",
        "Keep your standing leg slightly bent",
        "If you can't reach your foot, use a towel to help",
      ],
      modifications: [
        "Lie on your side if standing balance is difficult",
        "Use a towel around your ankle if you can't reach your foot",
        "Hold onto a wall for better balance",
      ],
    },
    "Quad Stretch - Left": {
      instructions: [
        "Instructions:",
        "1. Hold onto a wall or sturdy surface for balance",
        "2. Bend your right knee and grab your right foot behind you",
        "3. Gently pull your heel toward your glute",
        "4. Keep your knees close together",
        "5. Feel the stretch in the front of your thigh",
        "6. Hold for 30 seconds, then repeat on left side",
      ],
      tips: [
        "Don't pull too hard - gentle pressure is enough",
        "Keep your standing leg slightly bent",
        "If you can't reach your foot, use a towel to help",
      ],
      modifications: [
        "Lie on your side if standing balance is difficult",
        "Use a towel around your ankle if you can't reach your foot",
        "Hold onto a wall for better balance",
      ],
    },
    "Chest Stretch": {
      instructions: [
      "Instructions:",
        "1. Stand in a doorway with your forearms on the door frame",
        "2. Place elbows just below shoulder height",
        "3. Step one foot forward gently",
        "4. Feel the stretch across your chest and front shoulders",
        "5. Hold the position for 30 seconds",
      ],
      tips: [
        "Don't force the stretch - gentle pressure is effective",
        "Keep your head in neutral position",
        "Breathe deeply while stretching",
      ],
      modifications: [
        "Place hands on wall instead of in doorway",
        "Adjust elbow height for comfort",
        "Step forward less if stretch is too intense",
      ],
    },
    "Deep Breathing": {
      instructions: [
      "Instructions:",
        "1. Sit or stand quietly in a comfortable position",
        "2. Place one hand on your chest, one on your belly",
        "3. Inhale slowly through your nose for 4 counts",
        "4. Feel your belly expand more than your chest",
        "5. Exhale slowly through your mouth for 6 counts",
        "6. Repeat for 5 complete breath cycles",
      ],
      tips: [
        "Focus on making your exhale longer than your inhale",
        "This helps activate your body's relaxation response",
        "Let your heart rate gradually return to normal",
      ],
      modifications: [],
    },
  };

  const details = detailsMap[name] || { instructions: [], tips: [], modifications: [] };
  let instructions = details.instructions;
  if (!instructions[0]?.toLowerCase().startsWith("instructions:")) {
    instructions = ["Instructions:", ...instructions];
  }
  return {
    instructions,
    tips: details.tips,
    modifications: details.modifications,
  };
}
