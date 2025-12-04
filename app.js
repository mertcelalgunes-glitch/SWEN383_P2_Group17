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
