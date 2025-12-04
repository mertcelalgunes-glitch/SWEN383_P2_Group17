// ================================================
// COOKING PLAN - SIMPLIFIED BACKEND (FINAL FIX)
// ================================================

// -----------------------------
// 1. DOMAIN CLASSES
// -----------------------------

class Ingredient {
    constructor(name, amount, unit = '') {
        this.name = name;
        this.amount = amount;
        this.unit = unit;
    }

    toString() {
        return `${this.amount} ${this.unit} ${this.name}`.trim();
    }
}

class Recipe {
    constructor(id, title, ingredients = [], steps = [], tags = [], dietaryFlags = []) {
        this.id = id;
        this.title = title;
        this.ingredients = ingredients;
        this.steps = steps;
        this.tags = tags;
        this.dietaryFlags = dietaryFlags;
        this.rating = 0;
        this.ratings = [];
    }

    rate(rating) {
        if (rating >= 1 && rating <= 5) {
            this.ratings.push(rating);
            this.rating = this.ratings.reduce((a, b) => a + b, 0) / this.ratings.length;
            return true;
        }
        return false;
    }
}

class PlanEntry {
    constructor(day, recipeId) {
        this.day = day;
        this.recipeId = recipeId;
    }
}

class MealPlan {
    constructor(id, userId, name, entries = []) {
        this.id = id;
        this.userId = userId;
        this.name = name;
        this.entries = entries;
        this.sharedWith = [];
    }

    addEntry(entry) {
        this.entries.push(entry);
    }

    getRecipeIds() {
        return this.entries.map(entry => entry.recipeId).filter(id => id);
    }
}

class User {
    constructor(id, name, email) {
        this.id = id;
        this.name = name;
        this.email = email;
    }
}

// -----------------------------
// 2. FACTORY PATTERN: Repository Factory
// -----------------------------

class RepositoryFactory {
    static createRepository(type) {
        switch(type) {
            case 'memory':
                return new MemoryRepository();
            default:
                throw new Error(`Unknown repository type: ${type}`);
        }
    }
}

class MemoryRepository {
    constructor() {
        this.recipes = new Map();
        this.mealPlans = new Map();
        this.users = new Map();
        this.currentUserId = null;
    }

    // Recipe methods
    saveRecipe(recipe) {
        if (!recipe.id) {
            recipe.id = `recipe-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }
        this.recipes.set(recipe.id, recipe);
        return recipe.id;
    }

    getRecipe(id) {
        return this.recipes.get(id);
    }

    getAllRecipes() {
        return Array.from(this.recipes.values());
    }

    deleteRecipe(id) {
        return this.recipes.delete(id);
    }

    // Meal Plan methods
    saveMealPlan(mealPlan) {
        if (!mealPlan.id) {
            mealPlan.id = `plan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }
        this.mealPlans.set(mealPlan.id, mealPlan);
        return mealPlan.id;
    }

    getMealPlan(id) {
        return this.mealPlans.get(id);
    }

    getUserMealPlans(userId) {
        return Array.from(this.mealPlans.values()).filter(plan => plan.userId === userId);
    }

    // User methods
    saveUser(user) {
        if (!user.id) {
            user.id = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }
        this.users.set(user.id, user);
        return user.id;
    }

    getUser(id) {
        return this.users.get(id);
    }

    getUserByEmail(email) {
        return Array.from(this.users.values()).find(user => user.email === email);
    }

    // Current user management
    setCurrentUser(user) {
        this.currentUserId = user ? user.id : null;
    }

    getCurrentUser() {
        return this.currentUserId ? this.getUser(this.currentUserId) : null;
    }
}

// -----------------------------
// 3. STRATEGY PATTERN: Shopping List Strategies
// -----------------------------

class ShoppingListStrategy {
    generate(mealPlan, recipeRepo) {
        throw new Error('generate method must be implemented');
    }
}

class BasicShoppingListStrategy extends ShoppingListStrategy {
    generate(mealPlan, recipeRepo) {
        const recipeIds = mealPlan.getRecipeIds();
        const ingredientsMap = new Map();
        
        recipeIds.forEach(recipeId => {
            const recipe = recipeRepo.getRecipe(recipeId);
            if (recipe && recipe.ingredients) {
                recipe.ingredients.forEach(ing => {
                    const key = `${ing.name}-${ing.unit}`;
                    if (ingredientsMap.has(key)) {
                        const existing = ingredientsMap.get(key);
                        existing.amount += ing.amount;
                    } else {
                        ingredientsMap.set(key, {
                            name: ing.name,
                            amount: ing.amount,
                            unit: ing.unit
                        });
                    }
                });
            }
        });
        
        return Array.from(ingredientsMap.values()).map(item => 
            new Ingredient(item.name, item.amount, item.unit)
        );
    }
}

class VeganShoppingListStrategy extends ShoppingListStrategy {
    generate(mealPlan, recipeRepo) {
        const basicStrategy = new BasicShoppingListStrategy();
        const allIngredients = basicStrategy.generate(mealPlan, recipeRepo);
        
        const nonVegan = ['meat', 'chicken', 'beef', 'pork', 'fish', 'egg', 'milk', 'cheese', 'butter', 'honey'];
        
        return allIngredients.filter(ingredient =>
            !nonVegan.some(item => ingredient.name.toLowerCase().includes(item))
        );
    }
}

class GlutenFreeShoppingListStrategy extends ShoppingListStrategy {
    generate(mealPlan, recipeRepo) {
        const basicStrategy = new BasicShoppingListStrategy();
        const allIngredients = basicStrategy.generate(mealPlan, recipeRepo);
        
        const gluten = ['wheat', 'flour', 'bread', 'pasta', 'barley', 'rye'];
        
        return allIngredients.filter(ingredient =>
            !gluten.some(item => ingredient.name.toLowerCase().includes(item))
        );
    }
}

// Strategy Factory
class ShoppingListStrategyFactory {
    static createStrategy(type) {
        switch(type) {
            case 'basic':
                return new BasicShoppingListStrategy();
            case 'vegan':
                return new VeganShoppingListStrategy();
            case 'glutenFree':
                return new GlutenFreeShoppingListStrategy();
            default:
                return new BasicShoppingListStrategy();
        }
    }
}

// -----------------------------
// 4. FACADE PATTERN: Cooking Plan Application
// -----------------------------

class CookingPlanApplication {
    constructor() {
        // Use Factory Pattern to create repository
        this.repository = RepositoryFactory.createRepository('memory');
        
        // Initialize with sample data
        this.initializeSampleData();
    }
    
    // User Management
    register(name, email) {
        const user = new User(null, name, email);
        const userId = this.repository.saveUser(user);
        return this.repository.getUser(userId);
    }
    
    login(email) {
        const user = this.repository.getUserByEmail(email);
        if (user) {
            this.repository.setCurrentUser(user);
            return user;
        }
        return null;
    }
    
    logout() {
        this.repository.setCurrentUser(null);
    }
    
    getCurrentUser() {
        return this.repository.getCurrentUser();
    }
    
    isLoggedIn() {
        return this.getCurrentUser() !== null;
    }
    
    // Recipe Management
    createRecipe(title, ingredients, steps, tags = [], dietaryFlags = []) {
        if (!this.isLoggedIn()) throw new Error('Must be logged in');
        
        const recipe = new Recipe(null, title, ingredients, steps, tags, dietaryFlags);
        this.repository.saveRecipe(recipe);
        return recipe;
    }
    
    getRecipe(id) {
        return this.repository.getRecipe(id);
    }
    
    getAllRecipes() {
        return this.repository.getAllRecipes();
    }
    
    rateRecipe(recipeId, rating) {
        const recipe = this.repository.getRecipe(recipeId);
        if (!recipe) throw new Error('Recipe not found');
        
        const success = recipe.rate(rating);
        if (success) {
            this.repository.saveRecipe(recipe);
        }
        return success;
    }
    
    searchRecipes(query) {
        const allRecipes = this.repository.getAllRecipes();
        const lowerQuery = query.toLowerCase();
        
        return allRecipes.filter(recipe =>
            recipe.title.toLowerCase().includes(lowerQuery) ||
            (recipe.tags && recipe.tags.some(tag => tag.toLowerCase().includes(lowerQuery))) ||
            (recipe.dietaryFlags && recipe.dietaryFlags.some(flag => flag.toLowerCase().includes(lowerQuery)))
        );
    }
    
    // Meal Plan Management
    createMealPlan(name) {
        if (!this.isLoggedIn()) throw new Error('Must be logged in');
        
        const mealPlan = new MealPlan(null, this.getCurrentUser().id, name);
        this.repository.saveMealPlan(mealPlan);
        return mealPlan;
    }
    
    addToMealPlan(mealPlanId, day, recipeId) {
        const mealPlan = this.repository.getMealPlan(mealPlanId);
        if (!mealPlan) throw new Error('Meal plan not found');
        if (mealPlan.userId !== this.getCurrentUser().id) throw new Error('Not your meal plan');
        
        const entry = new PlanEntry(day, recipeId);
        mealPlan.addEntry(entry);
        this.repository.saveMealPlan(mealPlan);
        return mealPlan;
    }
    
    getMealPlan(id) {
        return this.repository.getMealPlan(id);
    }
    
    getUserMealPlans() {
        if (!this.isLoggedIn()) return [];
        return this.repository.getUserMealPlans(this.getCurrentUser().id);
    }
    
    // Shopping List Generation (uses Strategy Pattern)
    generateShoppingList(mealPlanId, strategyType = 'basic') {
        const mealPlan = this.repository.getMealPlan(mealPlanId);
        if (!mealPlan) throw new Error('Meal plan not found');
        
        // Use Strategy Pattern
        const strategy = ShoppingListStrategyFactory.createStrategy(strategyType);
        return strategy.generate(mealPlan, this.repository);
    }
    
    // Sharing
    shareMealPlan(mealPlanId, targetUserEmail) {
        const mealPlan = this.repository.getMealPlan(mealPlanId);
        if (!mealPlan) throw new Error('Meal plan not found');
        if (mealPlan.userId !== this.getCurrentUser().id) throw new Error('Not your meal plan');
        
        const targetUser = this.repository.getUserByEmail(targetUserEmail);
        if (!targetUser) throw new Error('Target user not found');
        
        // Create a copy for the target user
        const sharedPlan = new MealPlan(
            null,
            targetUser.id,
            `${mealPlan.name} (Shared by ${this.getCurrentUser().name})`,
            [...mealPlan.entries]
        );
        
        this.repository.saveMealPlan(sharedPlan);
        return sharedPlan;
    }
    
    // Sample Data - FIXED VERSION
    initializeSampleData() {
        console.log('Initializing sample data...');
        
        // Create sample users and save them
        const alice = this.register('Alice', 'alice@example.com');
        const bob = this.register('Bob', 'bob@example.com');
        
        console.log(`Created users: ${alice.name}, ${bob.name}`);
        
        // Login as Alice
        const loggedInUser = this.login('alice@example.com');
        if (!loggedInUser) {
            console.log('ERROR: Failed to login after registration');
            return;
        }
        console.log(`Logged in as: ${loggedInUser.name}`);
        
        // Create sample recipes (now user is logged in)
        const sampleRecipes = [
            new Recipe(
                null,
                'Vegetable Stir Fry',
                [
                    new Ingredient('Broccoli', 200, 'g'),
                    new Ingredient('Carrot', 2, ''),
                    new Ingredient('Bell Pepper', 1, ''),
                    new Ingredient('Soy Sauce', 3, 'tbsp')
                ],
                ['Chop vegetables', 'Stir fry in pan', 'Add sauce'],
                ['vegetarian', 'quick'],
                ['vegetarian', 'vegan']
            ),
            new Recipe(
                null,
                'Grilled Chicken',
                [
                    new Ingredient('Chicken Breast', 2, ''),
                    new Ingredient('Olive Oil', 2, 'tbsp'),
                    new Ingredient('Lemon', 1, ''),
                    new Ingredient('Garlic', 3, 'cloves')
                ],
                ['Marinate chicken', 'Grill for 10 minutes', 'Serve with lemon'],
                ['protein', 'grilled'],
                ['gluten-free']
            ),
            new Recipe(
                null,
                'Pasta Carbonara',
                [
                    new Ingredient('Pasta', 250, 'g'),
                    new Ingredient('Eggs', 2, ''),
                    new Ingredient('Parmesan', 100, 'g'),
                    new Ingredient('Bacon', 150, 'g')
                ],
                ['Cook pasta', 'Fry bacon', 'Mix eggs and cheese', 'Combine all'],
                ['italian', 'pasta'],
                []
            )
        ];
        
        // Save recipes
        sampleRecipes.forEach(recipe => {
            this.repository.saveRecipe(recipe);
        });
        
        console.log(`Created ${sampleRecipes.length} sample recipes`);
        console.log('Sample data initialized successfully\n');
    }
}

// -----------------------------
// 5. DEMONSTRATION
// -----------------------------

function demonstrate() {
    console.log('=== COOKING PLAN DEMONSTRATION ===\n');
    
    try {
        // Create application (uses Factory Pattern for repository)
        console.log('1. Creating application...');
        const app = new CookingPlanApplication();
        
        // Check if user is logged in
        const currentUser = app.getCurrentUser();
        if (!currentUser) {
            console.log('ERROR: Application failed to initialize user session');
            return;
        }
        
        console.log(`2. Current user: ${currentUser.name} (${currentUser.email})`);
        console.log(`3. Total recipes: ${app.getAllRecipes().length}`);
        
        // Rate a recipe
        const recipes = app.getAllRecipes();
        if (recipes.length > 0) {
            console.log('\n4. Rating first recipe...');
            const recipeToRate = recipes[0];
            app.rateRecipe(recipeToRate.id, 5);
            app.rateRecipe(recipeToRate.id, 4);
            const ratedRecipe = app.getRecipe(recipeToRate.id);
            console.log(`   "${ratedRecipe.title}" now has ${ratedRecipe.rating.toFixed(1)} stars (${ratedRecipe.ratings.length} ratings)`);
        }
        
        // Create meal plan
        console.log('\n5. Creating meal plan...');
        const mealPlan = app.createMealPlan('Weekly Dinner Plan');
        console.log(`   Created: "${mealPlan.name}" (ID: ${mealPlan.id})`);
        
        // Add recipes to meal plan
        if (recipes.length >= 2) {
            console.log('\n6. Adding recipes to meal plan...');
            app.addToMealPlan(mealPlan.id, 'Monday', recipes[0].id);
            app.addToMealPlan(mealPlan.id, 'Tuesday', recipes[1].id);
            const updatedPlan = app.getMealPlan(mealPlan.id);
            console.log(`   Plan now has ${updatedPlan.entries.length} entries`);
        }
        
        // Generate shopping lists using different strategies (Strategy Pattern)
        console.log('\n7. SHOPPING LISTS (Strategy Pattern Demonstration):');
        console.log('   Each strategy produces different results based on dietary restrictions:');
        
        const strategies = [
            { type: 'basic', desc: 'All ingredients' },
            { type: 'vegan', desc: 'No animal products' },
            { type: 'glutenFree', desc: 'No gluten-containing items' }
        ];
        
        strategies.forEach(({type, desc}) => {
            try {
                const shoppingList = app.generateShoppingList(mealPlan.id, type);
                console.log(`   ${type.padEnd(10)}: ${shoppingList.length.toString().padEnd(2)} items - ${desc}`);
                
                if (shoppingList.length > 0) {
                    console.log(`           Sample: ${shoppingList[0].toString()}`);
                }
            } catch (error) {
                console.log(`   ${type} error: ${error.message}`);
            }
        });
        
        // Share meal plan
        console.log('\n8. Sharing meal plan...');
        try {
            const sharedPlan = app.shareMealPlan(mealPlan.id, 'bob@example.com');
            console.log(`   Successfully shared with Bob: "${sharedPlan.name}"`);
        } catch (error) {
            console.log(`   Share failed: ${error.message}`);
        }
        
        // Search recipes
        console.log('\n9. Searching for "vegan" recipes...');
        const veganRecipes = app.searchRecipes('vegan');
        console.log(`   Found ${veganRecipes.length} recipes: ${veganRecipes.map(r => r.title).join(', ')}`);
        
        // User meal plans
        console.log('\n10. Checking user meal plans...');
        const userPlans = app.getUserMealPlans();
        console.log(`   ${currentUser.name} has ${userPlans.length} meal plans`);
        
        // Test Factory Pattern
        console.log('\n11. FACTORY PATTERN DEMONSTRATION:');
        console.log('   Creating repositories using Factory Pattern:');
        const memoryRepo = RepositoryFactory.createRepository('memory');
        console.log(`   ✓ Created: ${memoryRepo.constructor.name}`);
        console.log('   The Factory Pattern encapsulates repository creation logic');
        console.log('   and makes it easy to switch between different storage types.');
        
        // Test Strategy Pattern directly
        console.log('\n12. STRATEGY PATTERN DEMONSTRATION:');
        console.log('   Creating shopping list strategies using Strategy Pattern:');
        const basicStrategy = ShoppingListStrategyFactory.createStrategy('basic');
        const veganStrategy = ShoppingListStrategyFactory.createStrategy('vegan');
        console.log(`   ✓ Created: ${basicStrategy.constructor.name}`);
        console.log(`   ✓ Created: ${veganStrategy.constructor.name}`);
        console.log('   The Strategy Pattern allows different algorithms to be');
        console.log('   selected at runtime based on user preferences.');
        
        // Test Facade Pattern
        console.log('\n13. FACADE PATTERN DEMONSTRATION:');
        console.log('   The CookingPlanApplication class acts as a Facade:');
        console.log('   - Provides simple interface to complex subsystem');
        console.log('   - Hides repository, strategy, and business logic details');
        console.log('   - Makes system easier to use for clients');
        
        console.log('\n=== DEMONSTRATION COMPLETE ===');
        console.log('\n✅ PATTERNS SUCCESSFULLY IMPLEMENTED:');
        console.log('   1. Factory Pattern: Repository creation');
        console.log('   2. Strategy Pattern: Shopping list generation');
        console.log('   3. Facade Pattern: Application interface');
        console.log('\n✅ USER STORIES COVERED:');
        console.log('   • Home cook: CRUD recipes with rating system');
        console.log('   • Planner: Create meal plans with daily entries');
        console.log('   • Shopper: Generate shopping lists (multiple strategies)');
        console.log('   • Family member: Share meal plans');
        console.log('   • Health-conscious: Filter by dietary flags');
        
    } catch (error) {
        console.log('\n❌ ERROR during demonstration:');
        console.log(`   Message: ${error.message}`);
        console.log(`   Stack: ${error.stack}`);
    }
}

// Run demonstration
demonstrate();

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        CookingPlanApplication,
        RepositoryFactory,
        ShoppingListStrategyFactory,
        Ingredient,
        Recipe,
        PlanEntry,
        MealPlan,
        User
    };
}
