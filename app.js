class Ingredient {
    constructor(name, amount, unit = ('')) {
        this.name = name;
        this.amount = amount;
        this.unit = unit;

    }
    toString() {
        return '${this.amount} ${this.unit} ${this.name}' .trim();
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
            this.rating = this.rating.reduce((a, b) => a + b, 0) / this.ratings.length;
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

class RepositoryFactory {
    static createRepository(type) {
        switch(type) {
            case 'memory':
                return new MemoryRepository();
            default:
                throw new Error('Unkown repository type ${type}');
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

    saveRecipe(recipe) {
        if (!recipe.id) {
            recipe.id = 'recipe-${Date.now()}-${Math.random().toString(36).substr(2, 9)}';
        }
        this.recipes.set(recipe.id, recipe)
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

    saveMealPlan(mealPlan){
        if (!mealPlan.id) {
            mealPlan.id = 'plan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}';
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

saveUser(user) {
    if(!user.id) {
        user.id = 'user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}';
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

setCurrentUser(user) {
    this.currentUserId = user ? user.id : null;
}

getCurrentUser() {
    return this.currentUserId ? this.getUser(this.currentUserId) : null;
}
}

class ShoppingListStrategy {
    generate(mealPlan, recipeRepo) {
        throw new Error('generate method must be implemented');
    }
}

class BasicShoppingListStrategy extends ShoppingListStrategy {
    generate(mealPlan, recipeRepo) {
        const recipeIds = mealPlan.getRecipeIds();
        const ingredientsMap = new Map();

        recipeIds.forEach(recipeId =>{
            const recipe = recipeRepo.getRecipe(recipeId);
            if (recipe && recipe.ingredients) {
                recipe.ingredients.forEach(ing => {
                    const key = '${ing.name}-${ing.unit}';
                    if(ingredientsMap.has(key)) {
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
            ${mealPlan.name} (Shared by ${this.getCurrentUser().name}),
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
        
        console.log(Created users: ${alice.name}, ${bob.name});
        
        // Login as Alice
        const loggedInUser = this.login('alice@example.com');
        if (!loggedInUser) {
            console.log('ERROR: Failed to login after registration');
            return;
        }
        console.log(Logged in as: ${loggedInUser.name});