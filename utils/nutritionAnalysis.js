// utils/nutritionAnalysis.js - Utility for analyzing food text descriptions
const axios = require("axios");
const dotenv = require("dotenv");

dotenv.config();

/**
 * Simple food database for demo purposes
 * In a production app, this would be replaced with a call to a nutrition API
 */
const foodDatabase = {
  apple: { calories: 95, protein: 0.5, carbs: 25, fat: 0.3 },
  banana: { calories: 105, protein: 1.3, carbs: 27, fat: 0.4 },
  orange: { calories: 62, protein: 1.2, carbs: 15, fat: 0.2 },
  "chicken breast": { calories: 165, protein: 31, carbs: 0, fat: 3.6 },
  salmon: { calories: 206, protein: 22, carbs: 0, fat: 13 },
  rice: { calories: 130, protein: 2.7, carbs: 28, fat: 0.3 },
  pasta: { calories: 131, protein: 5, carbs: 25, fat: 1.1 },
  bread: { calories: 79, protein: 3, carbs: 15, fat: 1 },
  egg: { calories: 78, protein: 6, carbs: 0.6, fat: 5 },
  milk: { calories: 42, protein: 3.4, carbs: 5, fat: 1 },
  coffee: { calories: 2, protein: 0.1, carbs: 0, fat: 0 },
  tea: { calories: 1, protein: 0, carbs: 0.2, fat: 0 },
  yogurt: { calories: 59, protein: 3.5, carbs: 5, fat: 3.3 },
  cheese: { calories: 110, protein: 7, carbs: 0.4, fat: 9 },
  salad: { calories: 20, protein: 1, carbs: 3, fat: 0.2 },
  pizza: { calories: 285, protein: 12, carbs: 36, fat: 10 },
  burger: { calories: 354, protein: 20, carbs: 31, fat: 17 },
  fries: { calories: 312, protein: 3.4, carbs: 41, fat: 15 },
  soda: { calories: 140, protein: 0, carbs: 39, fat: 0 },
  "ice cream": { calories: 137, protein: 2.5, carbs: 16, fat: 7 },
  chocolate: { calories: 155, protein: 2, carbs: 15, fat: 9 },
  nuts: { calories: 184, protein: 7, carbs: 6, fat: 16 },
  avocado: { calories: 160, protein: 2, carbs: 8.5, fat: 14.7 },
  potato: { calories: 77, protein: 2, carbs: 17, fat: 0.1 },
  cereal: { calories: 110, protein: 3, carbs: 22, fat: 1 },
  bagel: { calories: 245, protein: 10, carbs: 48, fat: 1.5 },
  oatmeal: { calories: 150, protein: 5, carbs: 27, fat: 2.5 },
  sandwich: { calories: 300, protein: 15, carbs: 35, fat: 10 },
  wrap: { calories: 245, protein: 10, carbs: 36, fat: 8 },
  turkey: { calories: 165, protein: 24, carbs: 0, fat: 7 },
  steak: { calories: 271, protein: 26, carbs: 0, fat: 19 },
  fish: { calories: 136, protein: 22, carbs: 0, fat: 5 },
  shrimp: { calories: 99, protein: 24, carbs: 0, fat: 0.3 },
  tofu: { calories: 76, protein: 8, carbs: 2, fat: 4 },
  beans: { calories: 127, protein: 8, carbs: 23, fat: 0.5 },
  lentils: { calories: 116, protein: 9, carbs: 20, fat: 0.4 },
  "peanut butter": { calories: 188, protein: 8, carbs: 6, fat: 16 },
  "olive oil": { calories: 119, protein: 0, carbs: 0, fat: 14 },
  butter: { calories: 102, protein: 0.1, carbs: 0, fat: 11.5 },
  tomato: { calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2 },
  lettuce: { calories: 5, protein: 0.5, carbs: 1, fat: 0.1 },
  cucumber: { calories: 8, protein: 0.3, carbs: 1.9, fat: 0.1 },
  carrot: { calories: 25, protein: 0.6, carbs: 6, fat: 0.1 },
};

/**
 * Meal names and average calories
 */
const mealTypes = {
  breakfast: 400,
  lunch: 600,
  dinner: 700,
  snack: 200,
};

/**
 * Analyzes meal text to estimate calories and nutrition
 * @param {string} text - The meal description text
 * @returns {Object} - Nutrition data including calories, protein, carbs, fat
 */
exports.analyzeTextForCalories = async (text) => {
  try {
    // Check if we have access to an external API
    if (process.env.NUTRITION_API_KEY) {
      return await analyzeWithExternalAPI(text);
    } else {
      // Fallback to simple analysis
      return analyzeWithSimpleAlgorithm(text);
    }
  } catch (error) {
    console.error("Error analyzing meal text:", error);
    // Return a rough estimate based on meal type detection
    return roughEstimateBasedOnMealType(text);
  }
};

/**
 * A simple algorithm to analyze meal text
 * @param {string} text - The meal description text
 * @returns {Object} - Nutrition data
 */
const analyzeWithSimpleAlgorithm = (text) => {
  const lowerText = text.toLowerCase();
  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;

  // Check for meal type indicators
  let detectedMealType = null;
  for (const [mealType, _] of Object.entries(mealTypes)) {
    if (lowerText.includes(mealType)) {
      detectedMealType = mealType;
      break;
    }
  }

  // Look for known foods in the text
  let foodsFound = false;
  for (const [food, nutrition] of Object.entries(foodDatabase)) {
    // If the food is mentioned in the text
    if (lowerText.includes(food)) {
      foodsFound = true;

      // Check for quantity indicators
      let quantity = 1;

      // Simple quantity detection logic
      const words = lowerText.split(" ");
      const foodIndex = words.findIndex((word) => word.includes(food));

      if (foodIndex > 0) {
        const prevWord = words[foodIndex - 1];
        if (!isNaN(prevWord)) {
          quantity = parseFloat(prevWord);
        } else if (prevWord === "half" || prevWord === "a-half") {
          quantity = 0.5;
        } else if (prevWord === "quarter") {
          quantity = 0.25;
        } else if (prevWord === "double" || prevWord === "two") {
          quantity = 2;
        } else if (prevWord === "triple" || prevWord === "three") {
          quantity = 3;
        }
      }

      // Add nutrition values
      totalCalories += nutrition.calories * quantity;
      totalProtein += nutrition.protein * quantity;
      totalCarbs += nutrition.carbs * quantity;
      totalFat += nutrition.fat * quantity;
    }
  }

  // If no foods were found but we detected a meal type, use average values
  if (!foodsFound && detectedMealType) {
    return roughEstimateBasedOnMealType(text);
  }

  // If no foods were found and no meal type, make a very rough estimate
  if (!foodsFound && !detectedMealType) {
    totalCalories = 350; // Default average
    totalProtein = 15;
    totalCarbs = 35;
    totalFat = 12;
  }

  return {
    calories: Math.round(totalCalories),
    protein: Math.round(totalProtein),
    carbs: Math.round(totalCarbs),
    fat: Math.round(totalFat),
    description: text,
  };
};

/**
 * Make a rough estimate based on meal type
 * @param {string} text - The meal description text
 * @returns {Object} - Nutrition data
 */
const roughEstimateBasedOnMealType = (text) => {
  const lowerText = text.toLowerCase();

  for (const [mealType, avgCalories] of Object.entries(mealTypes)) {
    if (lowerText.includes(mealType)) {
      return {
        calories: avgCalories,
        protein: Math.round((avgCalories * 0.25) / 4), // 25% from protein
        carbs: Math.round((avgCalories * 0.5) / 4), // 50% from carbs
        fat: Math.round((avgCalories * 0.25) / 9), // 25% from fat
        description: text,
      };
    }
  }

  // Default values if no meal type is detected
  return {
    calories: 350,
    protein: 15,
    carbs: 35,
    fat: 12,
    description: text,
  };
};

/**
 * Analyze text using an external nutrition API
 * This is a placeholder for integration with a real nutrition API
 * @param {string} text - The meal description text
 * @returns {Object} - Nutrition data
 */
const analyzeWithExternalAPI = async (text) => {
  try {
    // This would be replaced with a real API call
    // Example with a hypothetical Nutrition API:
    /*
    const response = await axios.post('https://api.nutritionapi.com/analyze', {
      text: text,
      apiKey: process.env.NUTRITION_API_KEY
    });
    
    return {
      calories: response.data.calories,
      protein: response.data.protein,
      carbs: response.data.carbs,
      fat: response.data.fat,
      description: text
    };
    */

    // For now, just use our simple algorithm
    return analyzeWithSimpleAlgorithm(text);
  } catch (error) {
    console.error("Error calling nutrition API:", error);
    throw error;
  }
};
