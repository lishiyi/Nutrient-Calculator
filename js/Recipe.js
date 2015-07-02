
/**
 * A Recipe is responsible for specifying the amount of each ingredient that should be used.
 */
var Recipe = function(soylent, ingredientAmounts) {

    this.soylent = soylent;

    if (ingredientAmounts) {
        this.ingredientAmounts = ingredientAmounts;
    }
    else {
        this.ingredientAmounts = [];

        // Initialize the recipe with random amounts of each ingredient.
        for (var i = 0; i < this.soylent.ingredients.length; i++){
            var theMax = this.soylent.ingredients[i].maxAmount;
            var theMin = this.soylent.ingredients[i].minAmount;
            //we want 2/1 ratio of brown rice/pea protein
            //if(i == 5){

            //    this.ingredientAmounts.push( 10 ); //(ingredientAmounts[4] * 0.5)
            //}
            //else{
            //alert(this.soylent.ingredients[i]);
            this.ingredientAmounts.push(theMin + (Math.random() * (theMax - theMin)));
            //}
            
        }
    }

    this.calculateCompleteness();
};

/**
 * This function 'mates' two recipes, producing a 'child' recipe.
 * The child recipe contains most of it's parents chromosomes, with a few of them mutated slightly.
 */
Recipe.prototype.createChildWith = function(mate) {
    var theMax, theMin;

    // Pick random ingredient amounts from each parent.
    var pos = Math.floor(Math.random() * this.soylent.ingredients.length);
    var childIngredientAmounts = [];
    for (var i=0; i< this.soylent.ingredients.length; i++) {
        theMax = this.soylent.ingredients[i].maxAmount;
        theMin = this.soylent.ingredients[i].minAmount;

        var randomParent = Math.random() > 0.5 ? this : mate;
        var newIngredientAmount = randomParent.ingredientAmounts[i];
        newIngredientAmount = Math.min(newIngredientAmount, theMax);
        newIngredientAmount = Math.max(newIngredientAmount, theMin);
        //for the protein we want 2/1 ratio of brown rice/pea protein
        if(i == 5){

            childIngredientAmounts.push(childIngredientAmounts[4] * 0.5);
        }
        //let's keep it 50/25/25 for now barley malt/oats/rice flour [3]/[7]/[8]
        else if(i == 7 || i == 8){

            childIngredientAmounts.push(childIngredientAmounts[3] * 0.5);
        }
        else{

            childIngredientAmounts.push(randomParent.ingredientAmounts[i]);
        }
        
    }

    // Pick some random ingredient in the recipe to mutate.
    // A mutation is defined as increasing or decreasing the amount of an ingredient by the mutationMultiplier.
    while (Math.random() < this.soylent.mutationProbability){
        var ingredientToMutate = Math.floor(Math.random() * this.soylent.ingredients.length);
        var mutationMultiplier = Math.random() > 0.5 ? (1 - this.soylent.mutationMultiplier) : (1 + this.soylent.mutationMultiplier);
        theMax = this.soylent.ingredients[ingredientToMutate].maxAmount;
        theMin = this.soylent.ingredients[ingredientToMutate].minAmount;

        // Set the ingredient to a mutated value within the range of theMin to theMax
        childIngredientAmounts[ingredientToMutate] = Math.min(childIngredientAmounts[ingredientToMutate] * mutationMultiplier, theMax);
        childIngredientAmounts[ingredientToMutate] = Math.max(childIngredientAmounts[ingredientToMutate], theMin);
    }

    return new Recipe(this.soylent, childIngredientAmounts);
};

/**
 * Sets the current nutrient totals for the recipe.
 */
Recipe.prototype.calculateTotalNutrients = function() {

    var nutrients = _.keys(this.soylent.targetNutrients);
    this.nutrientTotals = {};

    _.each(this.soylent.ingredients, function(ingredient, idx) {
        _.each(nutrients, function(nutrient) {
            // this.ingredientAmounts[idx] is rounded to the nearest whole since we assume input
            // is in the form of the smallest measurable unit.
            var ingredientNutrient = ingredient[nutrient] * Math.round(this.ingredientAmounts[idx]);
            this.nutrientTotals[nutrient] = this.nutrientTotals[nutrient] || 0;
            this.nutrientTotals[nutrient] += ingredientNutrient;
        }, this);
    }, this);
};

/**
 * Returns the recipes score. The closer the number is to 0, the better.
 *
 * If the nutrientCompleteness is less than the min, compare to that.
 * If it is higher than the max, compare to that.
 * If it is between them, completeness = 0.
 */
Recipe.prototype.calculateCompleteness = function() {

    var nutrients = _.keys(this.soylent.targetNutrients);
    this.calculateTotalNutrients();
    this.nutrientCompleteness = {};

    var nutrientCompleteness = 0;
    _.each(nutrients, function(nutrient) {
        var completeness = 0;
        if (this.nutrientTotals[nutrient] < this.soylent.targetNutrients[nutrient].min) {
            completeness = 100 - (this.nutrientTotals[nutrient] / this.soylent.targetNutrients[nutrient].min * 100);
        }
        else if (this.nutrientTotals[nutrient] > this.soylent.targetNutrients[nutrient].max) {
            completeness = (this.nutrientTotals[nutrient] / this.soylent.targetNutrients[nutrient].max * 100) - 100;
        }
        else {
            completeness = 0;
        }
        completeness *= this.soylent.targetNutrients[nutrient].importanceFactor;
        //console.log(nutrient + ": " + completeness);
        nutrientCompleteness += completeness;
        this.nutrientCompleteness[nutrient] = completeness;
    }, this);

    this.ratioCompleteness = {};
    this.ratioAmounts = {};
    _.each(_.keys(this.soylent.ratios), function(theKey) {
        /* oringinal code
        var ratioEvaluation = this.nutrientTotals[this.soylent.ratios[theKey]["numerator"]] / this.nutrientTotals[this.soylent.ratios[theKey]["denominator"]] * this.soylent.ratios[theKey].unitCorrection;
        */
        var n = this.soylent.ratios[theKey]["numerator"];
        var d = this.soylent.ratios[theKey]["denominator"];
        if(isNaN(n)){

            var ratioEvaluation = this.nutrientTotals[n] / this.nutrientTotals[d] * this.soylent.ratios[theKey].unitCorrection;
        }
        else{

            var ratioEvaluation = n/d * this.soylent.ratios[theKey].unitCorrection;
        }
        /**
        The code above is what I change.
        */

        if (ratioEvaluation < this.soylent.ratios[theKey].min) {
            completeness = 100 - ((ratioEvaluation / this.soylent.ratios[theKey].min) * 100);
        }
        else if (ratioEvaluation > this.soylent.ratios[theKey].max) {
            completeness = ((ratioEvaluation / this.soylent.ratios[theKey].max * 100) - 100);
        }
        else {
            completeness = 0;
        }
        // console.log(this.soylent.ratios[theKey]["numerator"] + ": " + this.nutrientTotals[this.soylent.ratios[theKey]["numerator"]] + ", " + this.soylent.ratios[theKey]["denominator"] + ": " + this.nutrientTotals[this.soylent.ratios[theKey]["denominator"]]);
        // console.log(this.soylent.ratios[theKey].min + " -- " + ratioEvaluation + " -- " + this.soylent.ratios[theKey].max);
        // console.log("Complete: " + completeness);

        completeness *= this.soylent.ratios[theKey].importanceFactor;
        nutrientCompleteness += completeness;
        this.ratioCompleteness[theKey] = completeness;
        this.ratioAmounts[theKey] = ratioEvaluation;
    }, this);

    this.completenessScore = -nutrientCompleteness;
};


