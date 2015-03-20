//     Underscore.js 1.8.2
//     http://underscorejs.org
//     (c) 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
//     Underscore may be freely distributed under the MIT license.

(function() {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `exports` on the server.
  var root = this;

  // Save the previous value of the `_` variable.
  var previousUnderscore = root._;

  // Save bytes in the minified (but not gzipped) version:
  var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

  // Create quick reference variables for speed access to core prototypes.
  var
    push             = ArrayProto.push,
    slice            = ArrayProto.slice,
    toString         = ObjProto.toString,
    hasOwnProperty   = ObjProto.hasOwnProperty;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.
  var
    nativeIsArray      = Array.isArray,
    nativeKeys         = Object.keys,
    nativeBind         = FuncProto.bind,
    nativeCreate       = Object.create;

  // Naked function reference for surrogate-prototype-swapping.
  var Ctor = function(){};

  // Create a safe reference to the Underscore object for use below.
  var _ = function(obj) {
    if (obj instanceof _) return obj;
    if (!(this instanceof _)) return new _(obj);
    this._wrapped = obj;
  };

  // Export the Underscore object for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add `_` as a global object.
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = _;
    }
    exports._ = _;
  } else {
    root._ = _;
  }

  // Current version.
  _.VERSION = '1.8.2';

  // Internal function that returns an efficient (for current engines) version
  // of the passed-in callback, to be repeatedly applied in other Underscore
  // functions.
  var optimizeCb = function(func, context, argCount) {
    if (context === void 0) return func;
    switch (argCount == null ? 3 : argCount) {
      case 1: return function(value) {
        return func.call(context, value);
      };
      case 2: return function(value, other) {
        return func.call(context, value, other);
      };
      case 3: return function(value, index, collection) {
        return func.call(context, value, index, collection);
      };
      case 4: return function(accumulator, value, index, collection) {
        return func.call(context, accumulator, value, index, collection);
      };
    }
    return function() {
      return func.apply(context, arguments);
    };
  };

  // A mostly-internal function to generate callbacks that can be applied
  // to each element in a collection, returning the desired result — either
  // identity, an arbitrary callback, a property matcher, or a property accessor.
  var cb = function(value, context, argCount) {
    if (value == null) return _.identity;
    if (_.isFunction(value)) return optimizeCb(value, context, argCount);
    if (_.isObject(value)) return _.matcher(value);
    return _.property(value);
  };
  _.iteratee = function(value, context) {
    return cb(value, context, Infinity);
  };

  // An internal function for creating assigner functions.
  var createAssigner = function(keysFunc, undefinedOnly) {
    return function(obj) {
      var length = arguments.length;
      if (length < 2 || obj == null) return obj;
      for (var index = 1; index < length; index++) {
        var source = arguments[index],
            keys = keysFunc(source),
            l = keys.length;
        for (var i = 0; i < l; i++) {
          var key = keys[i];
          if (!undefinedOnly || obj[key] === void 0) obj[key] = source[key];
        }
      }
      return obj;
    };
  };

  // An internal function for creating a new object that inherits from another.
  var baseCreate = function(prototype) {
    if (!_.isObject(prototype)) return {};
    if (nativeCreate) return nativeCreate(prototype);
    Ctor.prototype = prototype;
    var result = new Ctor;
    Ctor.prototype = null;
    return result;
  };

  // Helper for collection methods to determine whether a collection
  // should be iterated as an array or as an object
  // Related: http://people.mozilla.org/~jorendorff/es6-draft.html#sec-tolength
  var MAX_ARRAY_INDEX = Math.pow(2, 53) - 1;
  var isArrayLike = function(collection) {
    var length = collection && collection.length;
    return typeof length == 'number' && length >= 0 && length <= MAX_ARRAY_INDEX;
  };

  // Collection Functions
  // --------------------

  // The cornerstone, an `each` implementation, aka `forEach`.
  // Handles raw objects in addition to array-likes. Treats all
  // sparse array-likes as if they were dense.
  _.each = _.forEach = function(obj, iteratee, context) {
    iteratee = optimizeCb(iteratee, context);
    var i, length;
    if (isArrayLike(obj)) {
      for (i = 0, length = obj.length; i < length; i++) {
        iteratee(obj[i], i, obj);
      }
    } else {
      var keys = _.keys(obj);
      for (i = 0, length = keys.length; i < length; i++) {
        iteratee(obj[keys[i]], keys[i], obj);
      }
    }
    return obj;
  };

  // Return the results of applying the iteratee to each element.
  _.map = _.collect = function(obj, iteratee, context) {
    iteratee = cb(iteratee, context);
    var keys = !isArrayLike(obj) && _.keys(obj),
        length = (keys || obj).length,
        results = Array(length);
    for (var index = 0; index < length; index++) {
      var currentKey = keys ? keys[index] : index;
      results[index] = iteratee(obj[currentKey], currentKey, obj);
    }
    return results;
  };

  // Create a reducing function iterating left or right.
  function createReduce(dir) {
    // Optimized iterator function as using arguments.length
    // in the main function will deoptimize the, see #1991.
    function iterator(obj, iteratee, memo, keys, index, length) {
      for (; index >= 0 && index < length; index += dir) {
        var currentKey = keys ? keys[index] : index;
        memo = iteratee(memo, obj[currentKey], currentKey, obj);
      }
      return memo;
    }

    return function(obj, iteratee, memo, context) {
      iteratee = optimizeCb(iteratee, context, 4);
      var keys = !isArrayLike(obj) && _.keys(obj),
          length = (keys || obj).length,
          index = dir > 0 ? 0 : length - 1;
      // Determine the initial value if none is provided.
      if (arguments.length < 3) {
        memo = obj[keys ? keys[index] : index];
        index += dir;
      }
      return iterator(obj, iteratee, memo, keys, index, length);
    };
  }

  // **Reduce** builds up a single result from a list of values, aka `inject`,
  // or `foldl`.
  _.reduce = _.foldl = _.inject = createReduce(1);

  // The right-associative version of reduce, also known as `foldr`.
  _.reduceRight = _.foldr = createReduce(-1);

  // Return the first value which passes a truth test. Aliased as `detect`.
  _.find = _.detect = function(obj, predicate, context) {
    var key;
    if (isArrayLike(obj)) {
      key = _.findIndex(obj, predicate, context);
    } else {
      key = _.findKey(obj, predicate, context);
    }
    if (key !== void 0 && key !== -1) return obj[key];
  };

  // Return all the elements that pass a truth test.
  // Aliased as `select`.
  _.filter = _.select = function(obj, predicate, context) {
    var results = [];
    predicate = cb(predicate, context);
    _.each(obj, function(value, index, list) {
      if (predicate(value, index, list)) results.push(value);
    });
    return results;
  };

  // Return all the elements for which a truth test fails.
  _.reject = function(obj, predicate, context) {
    return _.filter(obj, _.negate(cb(predicate)), context);
  };

  // Determine whether all of the elements match a truth test.
  // Aliased as `all`.
  _.every = _.all = function(obj, predicate, context) {
    predicate = cb(predicate, context);
    var keys = !isArrayLike(obj) && _.keys(obj),
        length = (keys || obj).length;
    for (var index = 0; index < length; index++) {
      var currentKey = keys ? keys[index] : index;
      if (!predicate(obj[currentKey], currentKey, obj)) return false;
    }
    return true;
  };

  // Determine if at least one element in the object matches a truth test.
  // Aliased as `any`.
  _.some = _.any = function(obj, predicate, context) {
    predicate = cb(predicate, context);
    var keys = !isArrayLike(obj) && _.keys(obj),
        length = (keys || obj).length;
    for (var index = 0; index < length; index++) {
      var currentKey = keys ? keys[index] : index;
      if (predicate(obj[currentKey], currentKey, obj)) return true;
    }
    return false;
  };

  // Determine if the array or object contains a given value (using `===`).
  // Aliased as `includes` and `include`.
  _.contains = _.includes = _.include = function(obj, target, fromIndex) {
    if (!isArrayLike(obj)) obj = _.values(obj);
    return _.indexOf(obj, target, typeof fromIndex == 'number' && fromIndex) >= 0;
  };

  // Invoke a method (with arguments) on every item in a collection.
  _.invoke = function(obj, method) {
    var args = slice.call(arguments, 2);
    var isFunc = _.isFunction(method);
    return _.map(obj, function(value) {
      var func = isFunc ? method : value[method];
      return func == null ? func : func.apply(value, args);
    });
  };

  // Convenience version of a common use case of `map`: fetching a property.
  _.pluck = function(obj, key) {
    return _.map(obj, _.property(key));
  };

  // Convenience version of a common use case of `filter`: selecting only objects
  // containing specific `key:value` pairs.
  _.where = function(obj, attrs) {
    return _.filter(obj, _.matcher(attrs));
  };

  // Convenience version of a common use case of `find`: getting the first object
  // containing specific `key:value` pairs.
  _.findWhere = function(obj, attrs) {
    return _.find(obj, _.matcher(attrs));
  };

  // Return the maximum element (or element-based computation).
  _.max = function(obj, iteratee, context) {
    var result = -Infinity, lastComputed = -Infinity,
        value, computed;
    if (iteratee == null && obj != null) {
      obj = isArrayLike(obj) ? obj : _.values(obj);
      for (var i = 0, length = obj.length; i < length; i++) {
        value = obj[i];
        if (value > result) {
          result = value;
        }
      }
    } else {
      iteratee = cb(iteratee, context);
      _.each(obj, function(value, index, list) {
        computed = iteratee(value, index, list);
        if (computed > lastComputed || computed === -Infinity && result === -Infinity) {
          result = value;
          lastComputed = computed;
        }
      });
    }
    return result;
  };

  // Return the minimum element (or element-based computation).
  _.min = function(obj, iteratee, context) {
    var result = Infinity, lastComputed = Infinity,
        value, computed;
    if (iteratee == null && obj != null) {
      obj = isArrayLike(obj) ? obj : _.values(obj);
      for (var i = 0, length = obj.length; i < length; i++) {
        value = obj[i];
        if (value < result) {
          result = value;
        }
      }
    } else {
      iteratee = cb(iteratee, context);
      _.each(obj, function(value, index, list) {
        computed = iteratee(value, index, list);
        if (computed < lastComputed || computed === Infinity && result === Infinity) {
          result = value;
          lastComputed = computed;
        }
      });
    }
    return result;
  };

  // Shuffle a collection, using the modern version of the
  // [Fisher-Yates shuffle](http://en.wikipedia.org/wiki/Fisher–Yates_shuffle).
  _.shuffle = function(obj) {
    var set = isArrayLike(obj) ? obj : _.values(obj);
    var length = set.length;
    var shuffled = Array(length);
    for (var index = 0, rand; index < length; index++) {
      rand = _.random(0, index);
      if (rand !== index) shuffled[index] = shuffled[rand];
      shuffled[rand] = set[index];
    }
    return shuffled;
  };

  // Sample **n** random values from a collection.
  // If **n** is not specified, returns a single random element.
  // The internal `guard` argument allows it to work with `map`.
  _.sample = function(obj, n, guard) {
    if (n == null || guard) {
      if (!isArrayLike(obj)) obj = _.values(obj);
      return obj[_.random(obj.length - 1)];
    }
    return _.shuffle(obj).slice(0, Math.max(0, n));
  };

  // Sort the object's values by a criterion produced by an iteratee.
  _.sortBy = function(obj, iteratee, context) {
    iteratee = cb(iteratee, context);
    return _.pluck(_.map(obj, function(value, index, list) {
      return {
        value: value,
        index: index,
        criteria: iteratee(value, index, list)
      };
    }).sort(function(left, right) {
      var a = left.criteria;
      var b = right.criteria;
      if (a !== b) {
        if (a > b || a === void 0) return 1;
        if (a < b || b === void 0) return -1;
      }
      return left.index - right.index;
    }), 'value');
  };

  // An internal function used for aggregate "group by" operations.
  var group = function(behavior) {
    return function(obj, iteratee, context) {
      var result = {};
      iteratee = cb(iteratee, context);
      _.each(obj, function(value, index) {
        var key = iteratee(value, index, obj);
        behavior(result, value, key);
      });
      return result;
    };
  };

  // Groups the object's values by a criterion. Pass either a string attribute
  // to group by, or a function that returns the criterion.
  _.groupBy = group(function(result, value, key) {
    if (_.has(result, key)) result[key].push(value); else result[key] = [value];
  });

  // Indexes the object's values by a criterion, similar to `groupBy`, but for
  // when you know that your index values will be unique.
  _.indexBy = group(function(result, value, key) {
    result[key] = value;
  });

  // Counts instances of an object that group by a certain criterion. Pass
  // either a string attribute to count by, or a function that returns the
  // criterion.
  _.countBy = group(function(result, value, key) {
    if (_.has(result, key)) result[key]++; else result[key] = 1;
  });

  // Safely create a real, live array from anything iterable.
  _.toArray = function(obj) {
    if (!obj) return [];
    if (_.isArray(obj)) return slice.call(obj);
    if (isArrayLike(obj)) return _.map(obj, _.identity);
    return _.values(obj);
  };

  // Return the number of elements in an object.
  _.size = function(obj) {
    if (obj == null) return 0;
    return isArrayLike(obj) ? obj.length : _.keys(obj).length;
  };

  // Split a collection into two arrays: one whose elements all satisfy the given
  // predicate, and one whose elements all do not satisfy the predicate.
  _.partition = function(obj, predicate, context) {
    predicate = cb(predicate, context);
    var pass = [], fail = [];
    _.each(obj, function(value, key, obj) {
      (predicate(value, key, obj) ? pass : fail).push(value);
    });
    return [pass, fail];
  };

  // Array Functions
  // ---------------

  // Get the first element of an array. Passing **n** will return the first N
  // values in the array. Aliased as `head` and `take`. The **guard** check
  // allows it to work with `_.map`.
  _.first = _.head = _.take = function(array, n, guard) {
    if (array == null) return void 0;
    if (n == null || guard) return array[0];
    return _.initial(array, array.length - n);
  };

  // Returns everything but the last entry of the array. Especially useful on
  // the arguments object. Passing **n** will return all the values in
  // the array, excluding the last N.
  _.initial = function(array, n, guard) {
    return slice.call(array, 0, Math.max(0, array.length - (n == null || guard ? 1 : n)));
  };

  // Get the last element of an array. Passing **n** will return the last N
  // values in the array.
  _.last = function(array, n, guard) {
    if (array == null) return void 0;
    if (n == null || guard) return array[array.length - 1];
    return _.rest(array, Math.max(0, array.length - n));
  };

  // Returns everything but the first entry of the array. Aliased as `tail` and `drop`.
  // Especially useful on the arguments object. Passing an **n** will return
  // the rest N values in the array.
  _.rest = _.tail = _.drop = function(array, n, guard) {
    return slice.call(array, n == null || guard ? 1 : n);
  };

  // Trim out all falsy values from an array.
  _.compact = function(array) {
    return _.filter(array, _.identity);
  };

  // Internal implementation of a recursive `flatten` function.
  var flatten = function(input, shallow, strict, startIndex) {
    var output = [], idx = 0;
    for (var i = startIndex || 0, length = input && input.length; i < length; i++) {
      var value = input[i];
      if (isArrayLike(value) && (_.isArray(value) || _.isArguments(value))) {
        //flatten current level of array or arguments object
        if (!shallow) value = flatten(value, shallow, strict);
        var j = 0, len = value.length;
        output.length += len;
        while (j < len) {
          output[idx++] = value[j++];
        }
      } else if (!strict) {
        output[idx++] = value;
      }
    }
    return output;
  };

  // Flatten out an array, either recursively (by default), or just one level.
  _.flatten = function(array, shallow) {
    return flatten(array, shallow, false);
  };

  // Return a version of the array that does not contain the specified value(s).
  _.without = function(array) {
    return _.difference(array, slice.call(arguments, 1));
  };

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // Aliased as `unique`.
  _.uniq = _.unique = function(array, isSorted, iteratee, context) {
    if (array == null) return [];
    if (!_.isBoolean(isSorted)) {
      context = iteratee;
      iteratee = isSorted;
      isSorted = false;
    }
    if (iteratee != null) iteratee = cb(iteratee, context);
    var result = [];
    var seen = [];
    for (var i = 0, length = array.length; i < length; i++) {
      var value = array[i],
          computed = iteratee ? iteratee(value, i, array) : value;
      if (isSorted) {
        if (!i || seen !== computed) result.push(value);
        seen = computed;
      } else if (iteratee) {
        if (!_.contains(seen, computed)) {
          seen.push(computed);
          result.push(value);
        }
      } else if (!_.contains(result, value)) {
        result.push(value);
      }
    }
    return result;
  };

  // Produce an array that contains the union: each distinct element from all of
  // the passed-in arrays.
  _.union = function() {
    return _.uniq(flatten(arguments, true, true));
  };

  // Produce an array that contains every item shared between all the
  // passed-in arrays.
  _.intersection = function(array) {
    if (array == null) return [];
    var result = [];
    var argsLength = arguments.length;
    for (var i = 0, length = array.length; i < length; i++) {
      var item = array[i];
      if (_.contains(result, item)) continue;
      for (var j = 1; j < argsLength; j++) {
        if (!_.contains(arguments[j], item)) break;
      }
      if (j === argsLength) result.push(item);
    }
    return result;
  };

  // Take the difference between one array and a number of other arrays.
  // Only the elements present in just the first array will remain.
  _.difference = function(array) {
    var rest = flatten(arguments, true, true, 1);
    return _.filter(array, function(value){
      return !_.contains(rest, value);
    });
  };

  // Zip together multiple lists into a single array -- elements that share
  // an index go together.
  _.zip = function() {
    return _.unzip(arguments);
  };

  // Complement of _.zip. Unzip accepts an array of arrays and groups
  // each array's elements on shared indices
  _.unzip = function(array) {
    var length = array && _.max(array, 'length').length || 0;
    var result = Array(length);

    for (var index = 0; index < length; index++) {
      result[index] = _.pluck(array, index);
    }
    return result;
  };

  // Converts lists into objects. Pass either a single array of `[key, value]`
  // pairs, or two parallel arrays of the same length -- one of keys, and one of
  // the corresponding values.
  _.object = function(list, values) {
    var result = {};
    for (var i = 0, length = list && list.length; i < length; i++) {
      if (values) {
        result[list[i]] = values[i];
      } else {
        result[list[i][0]] = list[i][1];
      }
    }
    return result;
  };

  // Return the position of the first occurrence of an item in an array,
  // or -1 if the item is not included in the array.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  _.indexOf = function(array, item, isSorted) {
    var i = 0, length = array && array.length;
    if (typeof isSorted == 'number') {
      i = isSorted < 0 ? Math.max(0, length + isSorted) : isSorted;
    } else if (isSorted && length) {
      i = _.sortedIndex(array, item);
      return array[i] === item ? i : -1;
    }
    if (item !== item) {
      return _.findIndex(slice.call(array, i), _.isNaN);
    }
    for (; i < length; i++) if (array[i] === item) return i;
    return -1;
  };

  _.lastIndexOf = function(array, item, from) {
    var idx = array ? array.length : 0;
    if (typeof from == 'number') {
      idx = from < 0 ? idx + from + 1 : Math.min(idx, from + 1);
    }
    if (item !== item) {
      return _.findLastIndex(slice.call(array, 0, idx), _.isNaN);
    }
    while (--idx >= 0) if (array[idx] === item) return idx;
    return -1;
  };

  // Generator function to create the findIndex and findLastIndex functions
  function createIndexFinder(dir) {
    return function(array, predicate, context) {
      predicate = cb(predicate, context);
      var length = array != null && array.length;
      var index = dir > 0 ? 0 : length - 1;
      for (; index >= 0 && index < length; index += dir) {
        if (predicate(array[index], index, array)) return index;
      }
      return -1;
    };
  }

  // Returns the first index on an array-like that passes a predicate test
  _.findIndex = createIndexFinder(1);

  _.findLastIndex = createIndexFinder(-1);

  // Use a comparator function to figure out the smallest index at which
  // an object should be inserted so as to maintain order. Uses binary search.
  _.sortedIndex = function(array, obj, iteratee, context) {
    iteratee = cb(iteratee, context, 1);
    var value = iteratee(obj);
    var low = 0, high = array.length;
    while (low < high) {
      var mid = Math.floor((low + high) / 2);
      if (iteratee(array[mid]) < value) low = mid + 1; else high = mid;
    }
    return low;
  };

  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](http://docs.python.org/library/functions.html#range).
  _.range = function(start, stop, step) {
    if (arguments.length <= 1) {
      stop = start || 0;
      start = 0;
    }
    step = step || 1;

    var length = Math.max(Math.ceil((stop - start) / step), 0);
    var range = Array(length);

    for (var idx = 0; idx < length; idx++, start += step) {
      range[idx] = start;
    }

    return range;
  };

  // Function (ahem) Functions
  // ------------------

  // Determines whether to execute a function as a constructor
  // or a normal function with the provided arguments
  var executeBound = function(sourceFunc, boundFunc, context, callingContext, args) {
    if (!(callingContext instanceof boundFunc)) return sourceFunc.apply(context, args);
    var self = baseCreate(sourceFunc.prototype);
    var result = sourceFunc.apply(self, args);
    if (_.isObject(result)) return result;
    return self;
  };

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally). Delegates to **ECMAScript 5**'s native `Function.bind` if
  // available.
  _.bind = function(func, context) {
    if (nativeBind && func.bind === nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
    if (!_.isFunction(func)) throw new TypeError('Bind must be called on a function');
    var args = slice.call(arguments, 2);
    var bound = function() {
      return executeBound(func, bound, context, this, args.concat(slice.call(arguments)));
    };
    return bound;
  };

  // Partially apply a function by creating a version that has had some of its
  // arguments pre-filled, without changing its dynamic `this` context. _ acts
  // as a placeholder, allowing any combination of arguments to be pre-filled.
  _.partial = function(func) {
    var boundArgs = slice.call(arguments, 1);
    var bound = function() {
      var position = 0, length = boundArgs.length;
      var args = Array(length);
      for (var i = 0; i < length; i++) {
        args[i] = boundArgs[i] === _ ? arguments[position++] : boundArgs[i];
      }
      while (position < arguments.length) args.push(arguments[position++]);
      return executeBound(func, bound, this, this, args);
    };
    return bound;
  };

  // Bind a number of an object's methods to that object. Remaining arguments
  // are the method names to be bound. Useful for ensuring that all callbacks
  // defined on an object belong to it.
  _.bindAll = function(obj) {
    var i, length = arguments.length, key;
    if (length <= 1) throw new Error('bindAll must be passed function names');
    for (i = 1; i < length; i++) {
      key = arguments[i];
      obj[key] = _.bind(obj[key], obj);
    }
    return obj;
  };

  // Memoize an expensive function by storing its results.
  _.memoize = function(func, hasher) {
    var memoize = function(key) {
      var cache = memoize.cache;
      var address = '' + (hasher ? hasher.apply(this, arguments) : key);
      if (!_.has(cache, address)) cache[address] = func.apply(this, arguments);
      return cache[address];
    };
    memoize.cache = {};
    return memoize;
  };

  // Delays a function for the given number of milliseconds, and then calls
  // it with the arguments supplied.
  _.delay = function(func, wait) {
    var args = slice.call(arguments, 2);
    return setTimeout(function(){
      return func.apply(null, args);
    }, wait);
  };

  // Defers a function, scheduling it to run after the current call stack has
  // cleared.
  _.defer = _.partial(_.delay, _, 1);

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time. Normally, the throttled function will run
  // as much as it can, without ever going more than once per `wait` duration;
  // but if you'd like to disable the execution on the leading edge, pass
  // `{leading: false}`. To disable execution on the trailing edge, ditto.
  _.throttle = function(func, wait, options) {
    var context, args, result;
    var timeout = null;
    var previous = 0;
    if (!options) options = {};
    var later = function() {
      previous = options.leading === false ? 0 : _.now();
      timeout = null;
      result = func.apply(context, args);
      if (!timeout) context = args = null;
    };
    return function() {
      var now = _.now();
      if (!previous && options.leading === false) previous = now;
      var remaining = wait - (now - previous);
      context = this;
      args = arguments;
      if (remaining <= 0 || remaining > wait) {
        if (timeout) {
          clearTimeout(timeout);
          timeout = null;
        }
        previous = now;
        result = func.apply(context, args);
        if (!timeout) context = args = null;
      } else if (!timeout && options.trailing !== false) {
        timeout = setTimeout(later, remaining);
      }
      return result;
    };
  };

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  _.debounce = function(func, wait, immediate) {
    var timeout, args, context, timestamp, result;

    var later = function() {
      var last = _.now() - timestamp;

      if (last < wait && last >= 0) {
        timeout = setTimeout(later, wait - last);
      } else {
        timeout = null;
        if (!immediate) {
          result = func.apply(context, args);
          if (!timeout) context = args = null;
        }
      }
    };

    return function() {
      context = this;
      args = arguments;
      timestamp = _.now();
      var callNow = immediate && !timeout;
      if (!timeout) timeout = setTimeout(later, wait);
      if (callNow) {
        result = func.apply(context, args);
        context = args = null;
      }

      return result;
    };
  };

  // Returns the first function passed as an argument to the second,
  // allowing you to adjust arguments, run code before and after, and
  // conditionally execute the original function.
  _.wrap = function(func, wrapper) {
    return _.partial(wrapper, func);
  };

  // Returns a negated version of the passed-in predicate.
  _.negate = function(predicate) {
    return function() {
      return !predicate.apply(this, arguments);
    };
  };

  // Returns a function that is the composition of a list of functions, each
  // consuming the return value of the function that follows.
  _.compose = function() {
    var args = arguments;
    var start = args.length - 1;
    return function() {
      var i = start;
      var result = args[start].apply(this, arguments);
      while (i--) result = args[i].call(this, result);
      return result;
    };
  };

  // Returns a function that will only be executed on and after the Nth call.
  _.after = function(times, func) {
    return function() {
      if (--times < 1) {
        return func.apply(this, arguments);
      }
    };
  };

  // Returns a function that will only be executed up to (but not including) the Nth call.
  _.before = function(times, func) {
    var memo;
    return function() {
      if (--times > 0) {
        memo = func.apply(this, arguments);
      }
      if (times <= 1) func = null;
      return memo;
    };
  };

  // Returns a function that will be executed at most one time, no matter how
  // often you call it. Useful for lazy initialization.
  _.once = _.partial(_.before, 2);

  // Object Functions
  // ----------------

  // Keys in IE < 9 that won't be iterated by `for key in ...` and thus missed.
  var hasEnumBug = !{toString: null}.propertyIsEnumerable('toString');
  var nonEnumerableProps = ['valueOf', 'isPrototypeOf', 'toString',
                      'propertyIsEnumerable', 'hasOwnProperty', 'toLocaleString'];

  function collectNonEnumProps(obj, keys) {
    var nonEnumIdx = nonEnumerableProps.length;
    var constructor = obj.constructor;
    var proto = (_.isFunction(constructor) && constructor.prototype) || ObjProto;

    // Constructor is a special case.
    var prop = 'constructor';
    if (_.has(obj, prop) && !_.contains(keys, prop)) keys.push(prop);

    while (nonEnumIdx--) {
      prop = nonEnumerableProps[nonEnumIdx];
      if (prop in obj && obj[prop] !== proto[prop] && !_.contains(keys, prop)) {
        keys.push(prop);
      }
    }
  }

  // Retrieve the names of an object's own properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`
  _.keys = function(obj) {
    if (!_.isObject(obj)) return [];
    if (nativeKeys) return nativeKeys(obj);
    var keys = [];
    for (var key in obj) if (_.has(obj, key)) keys.push(key);
    // Ahem, IE < 9.
    if (hasEnumBug) collectNonEnumProps(obj, keys);
    return keys;
  };

  // Retrieve all the property names of an object.
  _.allKeys = function(obj) {
    if (!_.isObject(obj)) return [];
    var keys = [];
    for (var key in obj) keys.push(key);
    // Ahem, IE < 9.
    if (hasEnumBug) collectNonEnumProps(obj, keys);
    return keys;
  };

  // Retrieve the values of an object's properties.
  _.values = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var values = Array(length);
    for (var i = 0; i < length; i++) {
      values[i] = obj[keys[i]];
    }
    return values;
  };

  // Returns the results of applying the iteratee to each element of the object
  // In contrast to _.map it returns an object
  _.mapObject = function(obj, iteratee, context) {
    iteratee = cb(iteratee, context);
    var keys =  _.keys(obj),
          length = keys.length,
          results = {},
          currentKey;
      for (var index = 0; index < length; index++) {
        currentKey = keys[index];
        results[currentKey] = iteratee(obj[currentKey], currentKey, obj);
      }
      return results;
  };

  // Convert an object into a list of `[key, value]` pairs.
  _.pairs = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var pairs = Array(length);
    for (var i = 0; i < length; i++) {
      pairs[i] = [keys[i], obj[keys[i]]];
    }
    return pairs;
  };

  // Invert the keys and values of an object. The values must be serializable.
  _.invert = function(obj) {
    var result = {};
    var keys = _.keys(obj);
    for (var i = 0, length = keys.length; i < length; i++) {
      result[obj[keys[i]]] = keys[i];
    }
    return result;
  };

  // Return a sorted list of the function names available on the object.
  // Aliased as `methods`
  _.functions = _.methods = function(obj) {
    var names = [];
    for (var key in obj) {
      if (_.isFunction(obj[key])) names.push(key);
    }
    return names.sort();
  };

  // Extend a given object with all the properties in passed-in object(s).
  _.extend = createAssigner(_.allKeys);

  // Assigns a given object with all the own properties in the passed-in object(s)
  // (https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object/assign)
  _.extendOwn = _.assign = createAssigner(_.keys);

  // Returns the first key on an object that passes a predicate test
  _.findKey = function(obj, predicate, context) {
    predicate = cb(predicate, context);
    var keys = _.keys(obj), key;
    for (var i = 0, length = keys.length; i < length; i++) {
      key = keys[i];
      if (predicate(obj[key], key, obj)) return key;
    }
  };

  // Return a copy of the object only containing the whitelisted properties.
  _.pick = function(object, oiteratee, context) {
    var result = {}, obj = object, iteratee, keys;
    if (obj == null) return result;
    if (_.isFunction(oiteratee)) {
      keys = _.allKeys(obj);
      iteratee = optimizeCb(oiteratee, context);
    } else {
      keys = flatten(arguments, false, false, 1);
      iteratee = function(value, key, obj) { return key in obj; };
      obj = Object(obj);
    }
    for (var i = 0, length = keys.length; i < length; i++) {
      var key = keys[i];
      var value = obj[key];
      if (iteratee(value, key, obj)) result[key] = value;
    }
    return result;
  };

   // Return a copy of the object without the blacklisted properties.
  _.omit = function(obj, iteratee, context) {
    if (_.isFunction(iteratee)) {
      iteratee = _.negate(iteratee);
    } else {
      var keys = _.map(flatten(arguments, false, false, 1), String);
      iteratee = function(value, key) {
        return !_.contains(keys, key);
      };
    }
    return _.pick(obj, iteratee, context);
  };

  // Fill in a given object with default properties.
  _.defaults = createAssigner(_.allKeys, true);

  // Create a (shallow-cloned) duplicate of an object.
  _.clone = function(obj) {
    if (!_.isObject(obj)) return obj;
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // Invokes interceptor with the obj, and then returns obj.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // Returns whether an object has a given set of `key:value` pairs.
  _.isMatch = function(object, attrs) {
    var keys = _.keys(attrs), length = keys.length;
    if (object == null) return !length;
    var obj = Object(object);
    for (var i = 0; i < length; i++) {
      var key = keys[i];
      if (attrs[key] !== obj[key] || !(key in obj)) return false;
    }
    return true;
  };


  // Internal recursive comparison function for `isEqual`.
  var eq = function(a, b, aStack, bStack) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the [Harmony `egal` proposal](http://wiki.ecmascript.org/doku.php?id=harmony:egal).
    if (a === b) return a !== 0 || 1 / a === 1 / b;
    // A strict comparison is necessary because `null == undefined`.
    if (a == null || b == null) return a === b;
    // Unwrap any wrapped objects.
    if (a instanceof _) a = a._wrapped;
    if (b instanceof _) b = b._wrapped;
    // Compare `[[Class]]` names.
    var className = toString.call(a);
    if (className !== toString.call(b)) return false;
    switch (className) {
      // Strings, numbers, regular expressions, dates, and booleans are compared by value.
      case '[object RegExp]':
      // RegExps are coerced to strings for comparison (Note: '' + /a/i === '/a/i')
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
        return '' + a === '' + b;
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive.
        // Object(NaN) is equivalent to NaN
        if (+a !== +a) return +b !== +b;
        // An `egal` comparison is performed for other numeric values.
        return +a === 0 ? 1 / +a === 1 / b : +a === +b;
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
        return +a === +b;
    }

    var areArrays = className === '[object Array]';
    if (!areArrays) {
      if (typeof a != 'object' || typeof b != 'object') return false;

      // Objects with different constructors are not equivalent, but `Object`s or `Array`s
      // from different frames are.
      var aCtor = a.constructor, bCtor = b.constructor;
      if (aCtor !== bCtor && !(_.isFunction(aCtor) && aCtor instanceof aCtor &&
                               _.isFunction(bCtor) && bCtor instanceof bCtor)
                          && ('constructor' in a && 'constructor' in b)) {
        return false;
      }
    }
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.

    // Initializing stack of traversed objects.
    // It's done here since we only need them for objects and arrays comparison.
    aStack = aStack || [];
    bStack = bStack || [];
    var length = aStack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (aStack[length] === a) return bStack[length] === b;
    }

    // Add the first object to the stack of traversed objects.
    aStack.push(a);
    bStack.push(b);

    // Recursively compare objects and arrays.
    if (areArrays) {
      // Compare array lengths to determine if a deep comparison is necessary.
      length = a.length;
      if (length !== b.length) return false;
      // Deep compare the contents, ignoring non-numeric properties.
      while (length--) {
        if (!eq(a[length], b[length], aStack, bStack)) return false;
      }
    } else {
      // Deep compare objects.
      var keys = _.keys(a), key;
      length = keys.length;
      // Ensure that both objects contain the same number of properties before comparing deep equality.
      if (_.keys(b).length !== length) return false;
      while (length--) {
        // Deep compare each member
        key = keys[length];
        if (!(_.has(b, key) && eq(a[key], b[key], aStack, bStack))) return false;
      }
    }
    // Remove the first object from the stack of traversed objects.
    aStack.pop();
    bStack.pop();
    return true;
  };

  // Perform a deep comparison to check if two objects are equal.
  _.isEqual = function(a, b) {
    return eq(a, b);
  };

  // Is a given array, string, or object empty?
  // An "empty" object has no enumerable own-properties.
  _.isEmpty = function(obj) {
    if (obj == null) return true;
    if (isArrayLike(obj) && (_.isArray(obj) || _.isString(obj) || _.isArguments(obj))) return obj.length === 0;
    return _.keys(obj).length === 0;
  };

  // Is a given value a DOM element?
  _.isElement = function(obj) {
    return !!(obj && obj.nodeType === 1);
  };

  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) === '[object Array]';
  };

  // Is a given variable an object?
  _.isObject = function(obj) {
    var type = typeof obj;
    return type === 'function' || type === 'object' && !!obj;
  };

  // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp, isError.
  _.each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp', 'Error'], function(name) {
    _['is' + name] = function(obj) {
      return toString.call(obj) === '[object ' + name + ']';
    };
  });

  // Define a fallback version of the method in browsers (ahem, IE < 9), where
  // there isn't any inspectable "Arguments" type.
  if (!_.isArguments(arguments)) {
    _.isArguments = function(obj) {
      return _.has(obj, 'callee');
    };
  }

  // Optimize `isFunction` if appropriate. Work around some typeof bugs in old v8,
  // IE 11 (#1621), and in Safari 8 (#1929).
  if (typeof /./ != 'function' && typeof Int8Array != 'object') {
    _.isFunction = function(obj) {
      return typeof obj == 'function' || false;
    };
  }

  // Is a given object a finite number?
  _.isFinite = function(obj) {
    return isFinite(obj) && !isNaN(parseFloat(obj));
  };

  // Is the given value `NaN`? (NaN is the only number which does not equal itself).
  _.isNaN = function(obj) {
    return _.isNumber(obj) && obj !== +obj;
  };

  // Is a given value a boolean?
  _.isBoolean = function(obj) {
    return obj === true || obj === false || toString.call(obj) === '[object Boolean]';
  };

  // Is a given value equal to null?
  _.isNull = function(obj) {
    return obj === null;
  };

  // Is a given variable undefined?
  _.isUndefined = function(obj) {
    return obj === void 0;
  };

  // Shortcut function for checking if an object has a given property directly
  // on itself (in other words, not on a prototype).
  _.has = function(obj, key) {
    return obj != null && hasOwnProperty.call(obj, key);
  };

  // Utility Functions
  // -----------------

  // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
  // previous owner. Returns a reference to the Underscore object.
  _.noConflict = function() {
    root._ = previousUnderscore;
    return this;
  };

  // Keep the identity function around for default iteratees.
  _.identity = function(value) {
    return value;
  };

  // Predicate-generating functions. Often useful outside of Underscore.
  _.constant = function(value) {
    return function() {
      return value;
    };
  };

  _.noop = function(){};

  _.property = function(key) {
    return function(obj) {
      return obj == null ? void 0 : obj[key];
    };
  };

  // Generates a function for a given object that returns a given property.
  _.propertyOf = function(obj) {
    return obj == null ? function(){} : function(key) {
      return obj[key];
    };
  };

  // Returns a predicate for checking whether an object has a given set of
  // `key:value` pairs.
  _.matcher = _.matches = function(attrs) {
    attrs = _.extendOwn({}, attrs);
    return function(obj) {
      return _.isMatch(obj, attrs);
    };
  };

  // Run a function **n** times.
  _.times = function(n, iteratee, context) {
    var accum = Array(Math.max(0, n));
    iteratee = optimizeCb(iteratee, context, 1);
    for (var i = 0; i < n; i++) accum[i] = iteratee(i);
    return accum;
  };

  // Return a random integer between min and max (inclusive).
  _.random = function(min, max) {
    if (max == null) {
      max = min;
      min = 0;
    }
    return min + Math.floor(Math.random() * (max - min + 1));
  };

  // A (possibly faster) way to get the current timestamp as an integer.
  _.now = Date.now || function() {
    return new Date().getTime();
  };

   // List of HTML entities for escaping.
  var escapeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '`': '&#x60;'
  };
  var unescapeMap = _.invert(escapeMap);

  // Functions for escaping and unescaping strings to/from HTML interpolation.
  var createEscaper = function(map) {
    var escaper = function(match) {
      return map[match];
    };
    // Regexes for identifying a key that needs to be escaped
    var source = '(?:' + _.keys(map).join('|') + ')';
    var testRegexp = RegExp(source);
    var replaceRegexp = RegExp(source, 'g');
    return function(string) {
      string = string == null ? '' : '' + string;
      return testRegexp.test(string) ? string.replace(replaceRegexp, escaper) : string;
    };
  };
  _.escape = createEscaper(escapeMap);
  _.unescape = createEscaper(unescapeMap);

  // If the value of the named `property` is a function then invoke it with the
  // `object` as context; otherwise, return it.
  _.result = function(object, property, fallback) {
    var value = object == null ? void 0 : object[property];
    if (value === void 0) {
      value = fallback;
    }
    return _.isFunction(value) ? value.call(object) : value;
  };

  // Generate a unique integer id (unique within the entire client session).
  // Useful for temporary DOM ids.
  var idCounter = 0;
  _.uniqueId = function(prefix) {
    var id = ++idCounter + '';
    return prefix ? prefix + id : id;
  };

  // By default, Underscore uses ERB-style template delimiters, change the
  // following template settings to use alternative delimiters.
  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g,
    escape      : /<%-([\s\S]+?)%>/g
  };

  // When customizing `templateSettings`, if you don't want to define an
  // interpolation, evaluation or escaping regex, we need one that is
  // guaranteed not to match.
  var noMatch = /(.)^/;

  // Certain characters need to be escaped so that they can be put into a
  // string literal.
  var escapes = {
    "'":      "'",
    '\\':     '\\',
    '\r':     'r',
    '\n':     'n',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  var escaper = /\\|'|\r|\n|\u2028|\u2029/g;

  var escapeChar = function(match) {
    return '\\' + escapes[match];
  };

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  // NB: `oldSettings` only exists for backwards compatibility.
  _.template = function(text, settings, oldSettings) {
    if (!settings && oldSettings) settings = oldSettings;
    settings = _.defaults({}, settings, _.templateSettings);

    // Combine delimiters into one regular expression via alternation.
    var matcher = RegExp([
      (settings.escape || noMatch).source,
      (settings.interpolate || noMatch).source,
      (settings.evaluate || noMatch).source
    ].join('|') + '|$', 'g');

    // Compile the template source, escaping string literals appropriately.
    var index = 0;
    var source = "__p+='";
    text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
      source += text.slice(index, offset).replace(escaper, escapeChar);
      index = offset + match.length;

      if (escape) {
        source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
      } else if (interpolate) {
        source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
      } else if (evaluate) {
        source += "';\n" + evaluate + "\n__p+='";
      }

      // Adobe VMs need the match returned to produce the correct offest.
      return match;
    });
    source += "';\n";

    // If a variable is not specified, place data values in local scope.
    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

    source = "var __t,__p='',__j=Array.prototype.join," +
      "print=function(){__p+=__j.call(arguments,'');};\n" +
      source + 'return __p;\n';

    try {
      var render = new Function(settings.variable || 'obj', '_', source);
    } catch (e) {
      e.source = source;
      throw e;
    }

    var template = function(data) {
      return render.call(this, data, _);
    };

    // Provide the compiled source as a convenience for precompilation.
    var argument = settings.variable || 'obj';
    template.source = 'function(' + argument + '){\n' + source + '}';

    return template;
  };

  // Add a "chain" function. Start chaining a wrapped Underscore object.
  _.chain = function(obj) {
    var instance = _(obj);
    instance._chain = true;
    return instance;
  };

  // OOP
  // ---------------
  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.

  // Helper function to continue chaining intermediate results.
  var result = function(instance, obj) {
    return instance._chain ? _(obj).chain() : obj;
  };

  // Add your own custom functions to the Underscore object.
  _.mixin = function(obj) {
    _.each(_.functions(obj), function(name) {
      var func = _[name] = obj[name];
      _.prototype[name] = function() {
        var args = [this._wrapped];
        push.apply(args, arguments);
        return result(this, func.apply(_, args));
      };
    });
  };

  // Add all of the Underscore functions to the wrapper object.
  _.mixin(_);

  // Add all mutator Array functions to the wrapper.
  _.each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      var obj = this._wrapped;
      method.apply(obj, arguments);
      if ((name === 'shift' || name === 'splice') && obj.length === 0) delete obj[0];
      return result(this, obj);
    };
  });

  // Add all accessor Array functions to the wrapper.
  _.each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      return result(this, method.apply(this._wrapped, arguments));
    };
  });

  // Extracts the result from a wrapped and chained object.
  _.prototype.value = function() {
    return this._wrapped;
  };

  // Provide unwrapping proxy for some methods used in engine operations
  // such as arithmetic and JSON stringification.
  _.prototype.valueOf = _.prototype.toJSON = _.prototype.value;

  _.prototype.toString = function() {
    return '' + this._wrapped;
  };

  // AMD registration happens at the end for compatibility with AMD loaders
  // that may not enforce next-turn semantics on modules. Even though general
  // practice for AMD registration is to be anonymous, underscore registers
  // as a named module because, like jQuery, it is a base library that is
  // popular enough to be bundled in a third party lib, but not be part of
  // an AMD load request. Those cases could generate an error when an
  // anonymous define() is called outside of a loader request.
  if (typeof define === 'function' && define.amd) {
    define('underscore', [], function() {
      return _;
    });
  }
}.call(this));

(function() {

  //
  // Browser compatibility and exports
  //
  var nextTick;
  if (typeof process !== 'undefined' && process.nextTick) {
    nextTick = process.nextTick
  } else {
    // Could alternatively just be nextTick = setTimeout, but relying
    // on the missing delay arg being treated as a 0 is undefined behaviour.
    nextTick = function(fn) { setTimeout(fn, 0) }
  }


  /**
   * An object representing a "promise" for a future value
   *
   * @param {function(Object)} onSuccess a function to handle successful
   *     resolution of this promise
   * @param {function(Error)} onFail a function to handle failed
   *     resolution of this promise
   * @constructor
   */
  function Promise(onSuccess, onFail) {
    this.promise = this
    this._isPromise = true
    this._successFn = onSuccess
    this._failFn = onFail
  }

  /**
   * See if this promise has been resolved with data
   *
   * @return {Boolean}
   */
  Promise.prototype.isResolved = function () {
    return this._hasData
  }

  Promise.prototype.whenResolved = function (f) {
    if (this.isResolved())
      return f(this.deref())
  }

  /**
   * See if this promise has been resolved either with data or an error
   *
   * @return {Boolean}
   */
  Promise.prototype.isComplete = function () {
    return this._hasData || this._error
  }

  /**
   * Get the value or error from this promise
   *
   * @return {Object} data
   */
  Promise.prototype.deref = function () {
    if (this._hasData)
      return this._data
    else if (this._error)
      return this._error
  }

  /**
   * Resolve this promise with a specified value
   *
   * @param {Object} data
   */
  Promise.prototype.resolve = function (data) {
    if (this.isComplete())
      throw new Error("Unable to resolve or reject the same promise twice");
    else if (data && data._isPromise)
      this._resolveWithPromise(data);
    else
      this._resolveWithValue(data);
  }

  /**
   * "Resolves" this promise with another promise. The provided promise will inherit all of the receiving
   * promise's child promises and completion handlers.
   *
   * Resolution of the child will bubble up to this promise.
   */
  Promise.prototype._resolveWithPromise = function (promise) {
    var i, _this = this;
    this._child = promise;

    // Add a then handler to resolve this promise if the child becomes resolved
    promise.then(function(v) { _this._hasData = true;  _this._data = v;    _this._error = null; return v },
                 function(e) { _this._hasData = false; _this._data = null; _this._error = e });

    if (this._promises) {
      for (var i = 0; i < this._promises.length; i += 1) {
        promise._chainPromise(this._promises[i]);
      }
      delete this._promises;
    }

    if (this._onComplete) {
      for (var i = 0; i < this._onComplete.length; i+= 1) {
        promise.fin(this._onComplete[i]);
      }
      delete this._onComplete;
    }
  }

  /**
   * Resolves this promise with a fulfilled value (not a promise).
   */
  Promise.prototype._resolveWithValue = function (value) {
    this._hasData = true;
    this._data = value;

    if (this._onComplete) {
      for (i = 0; i < this._onComplete.length; i++) {
        this._onComplete[i]();
      }
    }

    if (this._promises) {
      for (i = 0; i < this._promises.length; i += 1) {
        this._promises[i]._withInput(value);
      }
      delete this._promises;
    }
  }

  /**
   * Reject this promise with an error
   *
   * @param {Error} e
   */
  Promise.prototype.reject = function (e) {
    if (this.isComplete()) throw new Error("Unable to resolve or reject the same promise twice")

    var i
    this._error = e

    if (this._ended) {
      nextTick(function () {
        throw e
      })
    }

    if (this._onComplete) {
      for (i = 0; i < this._onComplete.length; i++) {
        this._onComplete[i]()
      }
    }

    if (this._promises) {
      for (i = 0; i < this._promises.length; i += 1) {
        this._promises[i]._withError(e)
      }
      delete this._promises
    }
  }

  /**
   * Provide a callback to be called whenever this promise successfully
   * resolves. Allows for an optional second callback to handle the failure
   * case.
   *
   * @param {function(Object)} onSuccess
   * @param {?function(Error)} onFail
   * @return {Promise} returns a new promise with the output of the onSuccess or
   *     onFail handler
   */
  Promise.prototype.then = function (onSuccess, onFail) {
    var promise = new Promise(onSuccess, onFail)

    if (this._child) this._child._chainPromise(promise)
    else this._chainPromise(promise)

    return promise
  }

  /**
   * Provide a callback to be called whenever this promise is rejected
   *
   * @param {function(Error)} onFail
   * @return {Promise} returns a new promise with the output of the onFail handler
   */
  Promise.prototype.fail = function (onFail) {
    return this.then(null, onFail)
  }

  /**
   * Provide a callback to be called whenever this promise is either resolved
   * or rejected.
   *
   * @param {function()} onComplete
   * @return {Promise} returns the current promise
   */
  Promise.prototype.fin = function (onComplete) {
    if (this.isComplete()) {
      onComplete()
      return this
    }

    if (this._child) {
      this._child.fin(onComplete)
    } else {
      if (!this._onComplete) this._onComplete = [onComplete]
      else this._onComplete.push(onComplete)
    }

    return this
  }

  /**
   * Mark this promise as "ended". If the promise is rejected, this will throw an
   * error in whatever scope it happens to be in
   *
   * @return {Promise} returns the current promise
   */
  Promise.prototype.end = function () {
    if (this._error) {
      throw this._error
    }
    this._ended = true
    return this
  }

  /**
   * Attempt to resolve this promise with the specified input
   *
   * @param {Object} data the input
   */
  Promise.prototype._withInput = function (data) {
    if (this._successFn) {
      try {
        if (data && data.__isArgs) {
          this.resolve(this._successFn.apply(this, data))
        } else {
          this.resolve(this._successFn(data))
        }
      } catch (e) {
        this._withError(e)
      }
    } else this.resolve(data)
  }

  /**
   * Reject this promise with the specified error
   *
   * @param {Error} e
   */
  Promise.prototype._withError = function (e) {
    var data;
    if (this._failFn)
      data = this._failFn(e)
    else
      console.error('Promise resolved with error', e, e.stack)

    if (data && data._isPromise) {
      if (this._successFn)
        data = data.then(this._successFn)
      this.resolve(data)
    }
    else this.reject(e)
  }

  /**
   * Chain a promise to the current promise
   *
   * @param {Promise} the promise to chain
   */
  Promise.prototype._chainPromise = function (promise) {
    var i

    if (this._child) {
      this._child._chainPromise(promise)
    } else if (this._hasData) {
      promise._withInput(this._data)
    } else if (this._error) {
      promise._withError(this._error)
    } else if (!this._promises) {
      this._promises = [promise]
    } else {
      this._promises.push(promise)
    }
  }

  /**
   * Utility function used for creating a node-style resolver
   * for deferreds
   *
   * @param {Promise} deferred a promise that looks like a deferred
   * @param {Error} err an optional error
   * @param {Object} data optional data
   */
  function resolver(deferred, err, data) {
    if (arguments.length > 3) {
      data = Array.prototype.slice.call(arguments, 2)
      data.__isArgs = true
    }
    if (err) deferred.reject(err)
    else deferred.resolve(data)
  }

  /**
   * Creates a node-style resolver for a deferred by wrapping
   * resolver()
   *
   * @return {function(Error, Object)} node-style callback
   */
  Promise.prototype.makeNodeResolver = function () {
    return resolver.bind(null, this)
  }

  /**
   * Static function which creates and resolves a promise immediately
   *
   * @param {Object} data data to resolve the promise with
   * @return {Promise}
   */
  function resolve(data) {
    var promise = new Promise()
    promise.resolve(data)
    return promise
  }

  /**
   * Static function which creates and rejects a promise immediately
   *
   * @param {Error} e error to reject the promise with
   * @return {Promise}
   */
  function reject(e) {
    var promise = new Promise()
    promise.reject(e)
    return promise
  }

  /**
   * Replace an element in an array with a new value. Used by .all() to
   * call from .then()
   *
   * @param {Array.<Object>} arr
   * @param {number} idx
   * @param {Object} val
   * @return {Object} the val that's being injected into the array
   */
  function replaceEl(arr, idx, val) {
    arr[idx] = val
    return val
  }

  /**
   * Takes in an array of promises or literals and returns a promise which returns
   * an array of values when all have resolved. If any fail, the promise fails.
   *
   * @param {Array.<Promise|Object>} promises
   * @return {Promise.<Array.<Object>>}
   */
  function all(promises) {
    if (arguments.length != 1 || !Array.isArray(promises)) {
      promises = Array.prototype.slice.call(arguments, 0)
    }
    if (!promises.length) return resolve([])

    var outputs = []
    var counter = 0
    var finished = false
    var promise = new Promise()
    var counter = promises.length

    for (var i = 0; i < promises.length; i += 1) {
      if (!promises[i] || !promises[i]._isPromise) {
        outputs[i] = promises[i]
        counter -= 1
      } else {
        promises[i].then(replaceEl.bind(null, outputs, i))
        .then(function () {
          counter--
          if (!finished && counter === 0) {
            finished = true
            promise.resolve(outputs)
          }
        }, function (e) {
          if (!finished) {
            finished = true
            promise.reject(e)
          }
        })
      }
    }

    if (counter === 0 && !finished) {
      finished = true
      promise.resolve(outputs)
    }

    return promise
  }

  /**
   * Create a new Promise which looks like a deferred
   *
   * @return {Promise}
   */
  function defer() {
    return new Promise()
  }

  /**
   * Return a promise which will wait a specified number of ms to resolve
   *
   * @param {number} delayMs
   * @param {Object} returnVal
   * @return {Promise.<Object>} returns returnVal
   */
  function delay(delayMs, returnVal) {
    var defer = new Promise()
    setTimeout(function () {
      defer.resolve(returnVal)
    }, delayMs)
    return defer
  }

  /**
   * Return a promise which will evaluate the function fn with the provided variable args
   *
   * @param {function} fn
   * @param {Object} var_args a variable number of arguments
   * @return {Promise}
   */
  function fcall(fn, var_args) {
    var defer = new Promise()
    defer.resolve(fn.apply(null, Array.prototype.slice.call(arguments, 1)))
    return defer
  }

  /**
   * Binds a function to a scope with an optional number of curried arguments. Attaches
   * a node style callback as the last argument and returns a promise
   *
   * @param {function} fn
   * @param {Object} scope
   * @param {Object} var_args a variable number of arguments
   * @return {Promise}
   */
  function bindPromise(fn, scope, var_args) {
    var rootArgs = Array.prototype.slice.call(arguments, 2)
    return function (var_args) {
      var defer = new Promise()
      fn.apply(scope, rootArgs.concat(Array.prototype.slice.call(arguments, 0), defer.makeNodeResolver()))
      return defer
    }
  }

  /**
   * The magic method is for magicians only.
   */
  function magic(fn) {
    return function() {
      var args = arguments.length ? Array.prototype.slice.call(arguments, 0) : []
      if (args.length && args[args.length - 1] === undefined) {
        args = args.slice(0, -1)
      }
      if (typeof args[args.length - 1] === 'function') {
        return fn.apply(this, args)
      } else {
        promise = defer()
        args.push(promise.makeNodeResolver())
        fn.apply(this, args)
        return promise
      }
    }
  }

  // Establish the root object, `window` in the browser, or `global` on the server.
  var root = this;
  var fnExports = {
      all: all
    , bindPromise: bindPromise
    , defer: defer
    , delay: delay
    , fcall: fcall
    , resolve: resolve
    , reject: reject
    , magic: magic
  }

  // Export the kew functions for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add function references to a "kew" namespace on the window.
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      module.exports = fnExports;
    }
    exports = fnExports;
  } else {
    root.kew = fnExports;
  }
}).call(this);

Date.CultureInfo = {
	/* Culture Name */
    name: "en-CA",
    englishName: "English (Canada)",
    nativeName: "English (Canada)",

    /* Day Name Strings */
    dayNames: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    abbreviatedDayNames: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    shortestDayNames: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"],
    firstLetterDayNames: ["S", "M", "T", "W", "T", "F", "S"],

    /* Month Name Strings */
    monthNames: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    abbreviatedMonthNames: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],

	/* AM/PM Designators */
    amDesignator: "AM",
    pmDesignator: "PM",

    firstDayOfWeek: 0,
    twoDigitYearMax: 2029,

    /**
     * The dateElementOrder is based on the order of the
     * format specifiers in the formatPatterns.DatePattern.
     *
     * Example:
     <pre>
     shortDatePattern    dateElementOrder
     ------------------  ----------------
     "M/d/yyyy"          "mdy"
     "dd/MM/yyyy"        "dmy"
     "yyyy-MM-dd"        "ymd"
     </pre>
     *
     * The correct dateElementOrder is required by the parser to
     * determine the expected order of the date elements in the
     * string being parsed.
     */
    dateElementOrder: "dmy",

    /* Standard date and time format patterns */
    formatPatterns: {
        shortDate: "dd/MM/yyyy",
        longDate: "MMMM d, yyyy",
        shortTime: "h:mm tt",
        longTime: "h:mm:ss tt",
        fullDateTime: "MMMM d, yyyy h:mm:ss tt",
        sortableDateTime: "yyyy-MM-ddTHH:mm:ss",
        universalSortableDateTime: "yyyy-MM-dd HH:mm:ssZ",
        rfc1123: "ddd, dd MMM yyyy HH:mm:ss GMT",
        monthDay: "MMMM dd",
        yearMonth: "MMMM, yyyy"
    },

    /**
     * NOTE: If a string format is not parsing correctly, but
     * you would expect it parse, the problem likely lies below.
     *
     * The following regex patterns control most of the string matching
     * within the parser.
     *
     * The Month name and Day name patterns were automatically generated
     * and in general should be (mostly) correct.
     *
     * Beyond the month and day name patterns are natural language strings.
     * Example: "next", "today", "months"
     *
     * These natural language string may NOT be correct for this culture.
     * If they are not correct, please translate and edit this file
     * providing the correct regular expression pattern.
     *
     * If you modify this file, please post your revised CultureInfo file
     * to the Datejs Forum located at http://www.datejs.com/forums/.
     *
     * Please mark the subject of the post with [CultureInfo]. Example:
     *    Subject: [CultureInfo] Translated "da-DK" Danish(Denmark)
     *
     * We will add the modified patterns to the master source files.
     *
     * As well, please review the list of "Future Strings" section below.
     */
    regexPatterns: {
        jan: /^jan(uary)?/i,
        feb: /^feb(ruary)?/i,
        mar: /^mar(ch)?/i,
        apr: /^apr(il)?/i,
        may: /^may/i,
        jun: /^jun(e)?/i,
        jul: /^jul(y)?/i,
        aug: /^aug(ust)?/i,
        sep: /^sep(t(ember)?)?/i,
        oct: /^oct(ober)?/i,
        nov: /^nov(ember)?/i,
        dec: /^dec(ember)?/i,

        sun: /^su(n(day)?)?/i,
        mon: /^mo(n(day)?)?/i,
        tue: /^tu(e(s(day)?)?)?/i,
        wed: /^we(d(nesday)?)?/i,
        thu: /^th(u(r(s(day)?)?)?)?/i,
        fri: /^fr(i(day)?)?/i,
        sat: /^sa(t(urday)?)?/i,

        future: /^next/i,
        past: /^last|past|prev(ious)?/i,
        add: /^(\+|aft(er)?|from|hence)/i,
        subtract: /^(\-|bef(ore)?|ago)/i,

        yesterday: /^yes(terday)?/i,
        today: /^t(od(ay)?)?/i,
        tomorrow: /^tom(orrow)?/i,
        now: /^n(ow)?/i,

        millisecond: /^ms|milli(second)?s?/i,
        second: /^sec(ond)?s?/i,
        minute: /^mn|min(ute)?s?/i,
		hour: /^h(our)?s?/i,
		week: /^w(eek)?s?/i,
        month: /^m(onth)?s?/i,
        day: /^d(ay)?s?/i,
        year: /^y(ear)?s?/i,

        shortMeridian: /^(a|p)/i,
        longMeridian: /^(a\.?m?\.?|p\.?m?\.?)/i,
        timezone: /^((e(s|d)t|c(s|d)t|m(s|d)t|p(s|d)t)|((gmt)?\s*(\+|\-)\s*\d\d\d\d?)|gmt|utc)/i,
        ordinalSuffix: /^\s*(st|nd|rd|th)/i,
        timeContext: /^\s*(\:|a(?!u|p)|p)/i
    },

	timezones: [{name:"UTC", offset:"-000"}, {name:"GMT", offset:"-000"}, {name:"EST", offset:"-0500"}, {name:"EDT", offset:"-0400"}, {name:"CST", offset:"-0600"}, {name:"CDT", offset:"-0500"}, {name:"MST", offset:"-0700"}, {name:"MDT", offset:"-0600"}, {name:"PST", offset:"-0800"}, {name:"PDT", offset:"-0700"}]
};

/********************
 ** Future Strings **
 ********************
 *
 * The following list of strings may not be currently being used, but
 * may be incorporated into the Datejs library later.
 *
 * We would appreciate any help translating the strings below.
 *
 * If you modify this file, please post your revised CultureInfo file
 * to the Datejs Forum located at http://www.datejs.com/forums/.
 *
 * Please mark the subject of the post with [CultureInfo]. Example:
 *    Subject: [CultureInfo] Translated "da-DK" Danish(Denmark)b
 *
 * English Name        Translated
 * ------------------  -----------------
 * about               about
 * ago                 ago
 * date                date
 * time                time
 * calendar            calendar
 * show                show
 * hourly              hourly
 * daily               daily
 * weekly              weekly
 * bi-weekly           bi-weekly
 * fortnight           fortnight
 * monthly             monthly
 * bi-monthly          bi-monthly
 * quarter             quarter
 * quarterly           quarterly
 * yearly              yearly
 * annual              annual
 * annually            annually
 * annum               annum
 * again               again
 * between             between
 * after               after
 * from now            from now
 * repeat              repeat
 * times               times
 * per                 per
 * min (abbrev minute) min
 * morning             morning
 * noon                noon
 * night               night
 * midnight            midnight
 * mid-night           mid-night
 * evening             evening
 * final               final
 * future              future
 * spring              spring
 * summer              summer
 * fall                fall
 * winter              winter
 * end of              end of
 * end                 end
 * long                long
 * short               short
 */
/**
 * @version: 1.0 Alpha-1
 * @author: Coolite Inc. http://www.coolite.com/
 * @date: 2008-04-13
 * @copyright: Copyright (c) 2006-2008, Coolite Inc. (http://www.coolite.com/). All rights reserved.
 * @license: Licensed under The MIT License. See license.txt and http://www.datejs.com/license/.
 * @website: http://www.datejs.com/
 */

(function () {
    Date.Parsing = {
        Exception: function (s) {
            this.message = "Parse error at '" + s.substring(0, 10) + " ...'";
        }
    };

    var $P = Date.Parsing;
    var _ = $P.Operators = {
        //
        // Tokenizers
        //
        rtoken: function (r) { // regex token
            return function (s) {
                var mx = s.match(r);
                if (mx) {
                    return ([ mx[0], s.substring(mx[0].length) ]);
                } else {
                    throw new $P.Exception(s);
                }
            };
        },
        token: function (s) { // whitespace-eating token
            return function (s) {
                return _.rtoken(new RegExp("^\s*" + s + "\s*"))(s);
                // Removed .strip()
                // return _.rtoken(new RegExp("^\s*" + s + "\s*"))(s).strip();
            };
        },
        stoken: function (s) { // string token
            return _.rtoken(new RegExp("^" + s));
        },

        //
        // Atomic Operators
        //

        until: function (p) {
            return function (s) {
                var qx = [], rx = null;
                while (s.length) {
                    try {
                        rx = p.call(this, s);
                    } catch (e) {
                        qx.push(rx[0]);
                        s = rx[1];
                        continue;
                    }
                    break;
                }
                return [ qx, s ];
            };
        },
        many: function (p) {
            return function (s) {
                var rx = [], r = null;
                while (s.length) {
                    try {
                        r = p.call(this, s);
                    } catch (e) {
                        return [ rx, s ];
                    }
                    rx.push(r[0]);
                    s = r[1];
                }
                return [ rx, s ];
            };
        },

        // generator operators -- see below
        optional: function (p) {
            return function (s) {
                var r = null;
                try {
                    r = p.call(this, s);
                } catch (e) {
                    return [ null, s ];
                }
                return [ r[0], r[1] ];
            };
        },
        not: function (p) {
            return function (s) {
                try {
                    p.call(this, s);
                } catch (e) {
                    return [null, s];
                }
                throw new $P.Exception(s);
            };
        },
        ignore: function (p) {
            return p ?
            function (s) {
                var r = null;
                r = p.call(this, s);
                return [null, r[1]];
            } : null;
        },
        product: function () {
            var px = arguments[0],
            qx = Array.prototype.slice.call(arguments, 1), rx = [];
            for (var i = 0 ; i < px.length ; i++) {
                rx.push(_.each(px[i], qx));
            }
            return rx;
        },
        cache: function (rule) {
            var cache = {}, r = null;
            return function (s) {
                try {
                    r = cache[s] = (cache[s] || rule.call(this, s));
                } catch (e) {
                    r = cache[s] = e;
                }
                if (r instanceof $P.Exception) {
                    throw r;
                } else {
                    return r;
                }
            };
        },

        // vector operators -- see below
        any: function () {
            var px = arguments;
            return function (s) {
                var r = null;
                for (var i = 0; i < px.length; i++) {
                    if (px[i] == null) {
                        continue;
                    }
                    try {
                        r = (px[i].call(this, s));
                    } catch (e) {
                        r = null;
                    }
                    if (r) {
                        return r;
                    }
                }
                throw new $P.Exception(s);
            };
        },
        each: function () {
            var px = arguments;
            return function (s) {
                var rx = [], r = null;
                for (var i = 0; i < px.length ; i++) {
                    if (px[i] == null) {
                        continue;
                    }
                    try {
                        r = (px[i].call(this, s));
                    } catch (e) {
                        throw new $P.Exception(s);
                    }
                    rx.push(r[0]);
                    s = r[1];
                }
                return [ rx, s];
            };
        },
        all: function () {
            var px = arguments, _ = _;
            return _.each(_.optional(px));
        },

        // delimited operators
        sequence: function (px, d, c) {
            d = d || _.rtoken(/^\s*/);
            c = c || null;

            if (px.length == 1) {
                return px[0];
            }
            return function (s) {
                var r = null, q = null;
                var rx = [];
                for (var i = 0; i < px.length ; i++) {
                    try {
                        r = px[i].call(this, s);
                    } catch (e) {
                        break;
                    }
                    rx.push(r[0]);
                    try {
                        q = d.call(this, r[1]);
                    } catch (ex) {
                        q = null;
                        break;
                    }
                    s = q[1];
                }
                if (!r) {
                    throw new $P.Exception(s);
                }
                if (q) {
                    throw new $P.Exception(q[1]);
                }
                if (c) {
                    try {
                        r = c.call(this, r[1]);
                    } catch (ey) {
                        throw new $P.Exception(r[1]);
                    }
                }
                return [ rx, (r?r[1]:s) ];
            };
        },

	    //
	    // Composite Operators
	    //

        between: function (d1, p, d2) {
            d2 = d2 || d1;
            var _fn = _.each(_.ignore(d1), p, _.ignore(d2));
            return function (s) {
                var rx = _fn.call(this, s);
                return [[rx[0][0], r[0][2]], rx[1]];
            };
        },
        list: function (p, d, c) {
            d = d || _.rtoken(/^\s*/);
            c = c || null;
            return (p instanceof Array ?
                _.each(_.product(p.slice(0, -1), _.ignore(d)), p.slice(-1), _.ignore(c)) :
                _.each(_.many(_.each(p, _.ignore(d))), px, _.ignore(c)));
        },
        set: function (px, d, c) {
            d = d || _.rtoken(/^\s*/);
            c = c || null;
            return function (s) {
                // r is the current match, best the current 'best' match
                // which means it parsed the most amount of input
                var r = null, p = null, q = null, rx = null, best = [[], s], last = false;

                // go through the rules in the given set
                for (var i = 0; i < px.length ; i++) {

                    // last is a flag indicating whether this must be the last element
                    // if there is only 1 element, then it MUST be the last one
                    q = null;
                    p = null;
                    r = null;
                    last = (px.length == 1);

                    // first, we try simply to match the current pattern
                    // if not, try the next pattern
                    try {
                        r = px[i].call(this, s);
                    } catch (e) {
                        continue;
                    }

                    // since we are matching against a set of elements, the first
                    // thing to do is to add r[0] to matched elements
                    rx = [[r[0]], r[1]];

                    // if we matched and there is still input to parse and
                    // we don't already know this is the last element,
                    // we're going to next check for the delimiter ...
                    // if there's none, or if there's no input left to parse
                    // than this must be the last element after all ...
                    if (r[1].length > 0 && ! last) {
                        try {
                            q = d.call(this, r[1]);
                        } catch (ex) {
                            last = true;
                        }
                    } else {
                        last = true;
                    }

				    // if we parsed the delimiter and now there's no more input,
				    // that means we shouldn't have parsed the delimiter at all
				    // so don't update r and mark this as the last element ...
                    if (!last && q[1].length === 0) {
                        last = true;
                    }


				    // so, if this isn't the last element, we're going to see if
				    // we can get any more matches from the remaining (unmatched)
				    // elements ...
                    if (!last) {

                        // build a list of the remaining rules we can match against,
                        // i.e., all but the one we just matched against
                        var qx = [];
                        for (var j = 0; j < px.length ; j++) {
                            if (i != j) {
                                qx.push(px[j]);
                            }
                        }

                        // now invoke recursively set with the remaining input
                        // note that we don't include the closing delimiter ...
                        // we'll check for that ourselves at the end
                        p = _.set(qx, d).call(this, q[1]);

                        // if we got a non-empty set as a result ...
                        // (otw rx already contains everything we want to match)
                        if (p[0].length > 0) {
                            // update current result, which is stored in rx ...
                            // basically, pick up the remaining text from p[1]
                            // and concat the result from p[0] so that we don't
                            // get endless nesting ...
                            rx[0] = rx[0].concat(p[0]);
                            rx[1] = p[1];
                        }
                    }

				    // at this point, rx either contains the last matched element
				    // or the entire matched set that starts with this element.

				    // now we just check to see if this variation is better than
				    // our best so far, in terms of how much of the input is parsed
                    if (rx[1].length < best[1].length) {
                        best = rx;
                    }

				    // if we've parsed all the input, then we're finished
                    if (best[1].length === 0) {
                        break;
                    }
                }

			    // so now we've either gone through all the patterns trying them
			    // as the initial match; or we found one that parsed the entire
			    // input string ...

			    // if best has no matches, just return empty set ...
                if (best[0].length === 0) {
                    return best;
                }

			    // if a closing delimiter is provided, then we have to check it also
                if (c) {
                    // we try this even if there is no remaining input because the pattern
                    // may well be optional or match empty input ...
                    try {
                        q = c.call(this, best[1]);
                    } catch (ey) {
                        throw new $P.Exception(best[1]);
                    }

                    // it parsed ... be sure to update the best match remaining input
                    best[1] = q[1];
                }

			    // if we're here, either there was no closing delimiter or we parsed it
			    // so now we have the best match; just return it!
                return best;
            };
        },
        forward: function (gr, fname) {
            return function (s) {
                return gr[fname].call(this, s);
            };
        },

        //
        // Translation Operators
        //
        replace: function (rule, repl) {
            return function (s) {
                var r = rule.call(this, s);
                return [repl, r[1]];
            };
        },
        process: function (rule, fn) {
            return function (s) {
                var r = rule.call(this, s);
                return [fn.call(this, r[0]), r[1]];
            };
        },
        min: function (min, rule) {
            return function (s) {
                var rx = rule.call(this, s);
                if (rx[0].length < min) {
                    throw new $P.Exception(s);
                }
                return rx;
            };
        }
    };


	// Generator Operators And Vector Operators

	// Generators are operators that have a signature of F(R) => R,
	// taking a given rule and returning another rule, such as
	// ignore, which parses a given rule and throws away the result.

	// Vector operators are those that have a signature of F(R1,R2,...) => R,
	// take a list of rules and returning a new rule, such as each.

	// Generator operators are converted (via the following _generator
	// function) into functions that can also take a list or array of rules
	// and return an array of new rules as though the function had been
	// called on each rule in turn (which is what actually happens).

	// This allows generators to be used with vector operators more easily.
	// Example:
	// each(ignore(foo, bar)) instead of each(ignore(foo), ignore(bar))

	// This also turns generators into vector operators, which allows
	// constructs like:
	// not(cache(foo, bar))

    var _generator = function (op) {
        return function () {
            var args = null, rx = [];
            if (arguments.length > 1) {
                args = Array.prototype.slice.call(arguments);
            } else if (arguments[0] instanceof Array) {
                args = arguments[0];
            }
            if (args) {
                for (var i = 0, px = args.shift() ; i < px.length ; i++) {
                    args.unshift(px[i]);
                    rx.push(op.apply(null, args));
                    args.shift();
                    return rx;
                }
            } else {
                return op.apply(null, arguments);
            }
        };
    };

    var gx = "optional not ignore cache".split(/\s/);

    for (var i = 0 ; i < gx.length ; i++) {
        _[gx[i]] = _generator(_[gx[i]]);
    }

    var _vector = function (op) {
        return function () {
            if (arguments[0] instanceof Array) {
                return op.apply(null, arguments[0]);
            } else {
                return op.apply(null, arguments);
            }
        };
    };

    var vx = "each any all".split(/\s/);

    for (var j = 0 ; j < vx.length ; j++) {
        _[vx[j]] = _vector(_[vx[j]]);
    }

}());

(function () {
    var $D = Date, $P = $D.prototype, $C = $D.CultureInfo;

    var flattenAndCompact = function (ax) {
        var rx = [];
        for (var i = 0; i < ax.length; i++) {
            if (ax[i] instanceof Array) {
                rx = rx.concat(flattenAndCompact(ax[i]));
            } else {
                if (ax[i]) {
                    rx.push(ax[i]);
                }
            }
        }
        return rx;
    };

    $D.Grammar = {};

    $D.Translator = {
        hour: function (s) {
            return function () {
                this.hour = Number(s);
            };
        },
        minute: function (s) {
            return function () {
                this.minute = Number(s);
            };
        },
        second: function (s) {
            return function () {
                this.second = Number(s);
            };
        },
        millisecond: function (s) {
            return function () {
                this.millisecond = Number(s);
            };
        },
        meridian: function (s) {
            return function () {
                this.meridian = s.slice(0, 1).toLowerCase();
            };
        },
        timezone: function (s) {
            return function () {
                var n = s.replace(/[^\d\+\-]/g, "");
                if (n.length) {
                    // parse offset into iso8601 parts
                    var zp = n.match(/(\+|-)(\d{2})(\d{2})?/);
                    // minute offsets must be converted to base of 100
                    var mo = parseInt((parseInt(zp[3]) || 0) / .6).toString();
                    mo = mo.length < 2 ? "0" + mo : mo;
                    this.timezoneOffset = zp[1] + zp[2] + mo;
                } else {
                    this.timezone = s.toLowerCase();
                }
            };
        },
        day: function (x) {
            var s = x[0];
            return function () {
                this.day = Number(s.match(/\d+/)[0]);
            };
        },
        month: function (s) {
            return function () {
                this.month = (s.length == 3) ? "jan feb mar apr may jun jul aug sep oct nov dec".indexOf(s)/4 : Number(s) - 1;
            };
        },
        year: function (s) {
            return function () {
                var n = Number(s);
                this.year = ((s.length > 2) ? n :
                    (n + (((n + 2000) < $C.twoDigitYearMax) ? 2000 : 1900)));
            };
        },
        rday: function (s) {
            return function () {
                switch (s) {
                case "yesterday":
                    this.days = -1;
                    break;
                case "tomorrow":
                    this.days = 1;
                    break;
                case "today":
                    this.days = 0;
                    break;
                case "now":
                    this.days = 0;
                    this.now = true;
                    break;
                }
            };
        },
        finishExact: function (x) {
            x = (x instanceof Array) ? x : [ x ];

            for (var i = 0 ; i < x.length ; i++) {
                if (x[i]) {
                    x[i].call(this);
                }
            }

            var now = new Date();

            if ((this.hour || this.minute) && (!this.month && !this.year && !this.day)) {
                this.day = now.getDate();
            }

            if (!this.year) {
                this.year = now.getFullYear();
            }

            if (!this.month && this.month !== 0) {
                this.month = now.getMonth();
            }

            if (!this.day) {
                this.day = 1;
            }

            if (!this.hour) {
                this.hour = 0;
            }

            if (!this.minute) {
                this.minute = 0;
            }

            if (!this.second) {
                this.second = 0;
            }

            if(!this.millisecond) {
                this.millisecond = 0;
            }

            if (this.meridian && this.hour) {
                if (this.meridian == "p" && this.hour < 12) {
                    this.hour = this.hour + 12;
                } else if (this.meridian == "a" && this.hour == 12) {
                    this.hour = 0;
                }
            }

            if (this.day > $D.getDaysInMonth(this.year, this.month)) {
                throw new RangeError(this.day + " is not a valid value for days.");
            }

            var r = new Date(this.year, this.month, this.day, this.hour, this.minute, this.second, this.millisecond);

            if (this.timezone) {
                r.set({ timezone: this.timezone });
            } else if (this.timezoneOffset) {
                r.setTimezoneOffset(this.timezoneOffset);
            }

            return r;
        },
        finish: function (x) {
            x = (x instanceof Array) ? flattenAndCompact(x) : [ x ];

            if (x.length === 0) {
                return null;
            }

            for (var i = 0 ; i < x.length ; i++) {
                if (typeof x[i] == "function") {
                    x[i].call(this);
                }
            }

            var today = $D.today();

            // For parsing: "now"
            if (this.now && !this.unit && !this.operator) {
                return new Date();
            } else if (this.now) {
                today = new Date();
            }

            var expression = !!(this.days && this.days !== null || this.orient || this.operator || this.bias);
            var realExpression = !!(this.days && this.days !== null || this.orient || this.operator);

            var gap, mod, orient;
            orient = ((this.orient == "past" || this.operator == "subtract" || this.bias == "past") ? -1 : 1);

            // For parsing: "last second", "next minute", "previous hour", "+5 seconds",
            //   "-5 hours", "5 hours", "7 hours ago"
            if(!this.now && "hour minute second".indexOf(this.unit) != -1) {
                today.setTimeToNow();
            }

            // For parsing: "5 hours", "2 days", "3 years ago",
            //    "7 days from now"
            if ((this.month || this.month === 0) && ("year day hour minute second".indexOf(this.unit) != -1)) {
                this.value = this.month + 1;
                this.month = null;
                expression = true;
            }

            // For parsing: "monday @ 8pm", "12p on monday", "Friday"
            if (!expression && this.weekday && !this.day && !this.days) {
                var temp = Date[this.weekday]();
                this.day = temp.getDate();
                if (!this.month) {
                    this.month = temp.getMonth();
                }
                this.year = temp.getFullYear();
            }

            // For parsing: "prev thursday", "next friday", "last friday at 20:00"
            if (expression && this.weekday && this.unit != "month") {
                this.unit = "day";
                gap = ($D.getDayNumberFromName(this.weekday) - today.getDay());
                mod = 7;
                this.days = gap ? ((gap + (orient * mod)) % mod) : (orient * mod);
            }

            // For parsing: "t+1 m", "today + 1 month", "+1 month", "-5 months"
            if (!this.month && this.value && this.unit == "month" && !this.now) {
                this.month = this.value;
                expression = true;
            }

            // For parsing: "last january", "prev march", "next july", "today + 1 month",
            //   "+5 months"
            if ((expression && !this.bias) && (this.month || this.month === 0) && this.unit != "year") {
                this.unit = "month";
                gap = (this.month - today.getMonth());
                mod = 12;
                this.months = gap ? ((gap + (orient * mod)) % mod) : (orient * mod);
                this.month = null;
            }

            // For parsing: "last monday", "last friday", "previous day",
            //   "next week", "next month", "next year",
            //   "today+", "+", "-", "yesterday at 4:00", "last friday at 20:00"
            if (!this.value && realExpression) {
                this.value = 1;
            }

            // For parsing: "15th at 20:15", "15th at 8pm", "today+", "t+5"
            if (!this.unit && (!expression || this.value)) {
              this.unit = "day";
            }

            // For parsing: "15th at 20:15", "15th at 8pm"
            if ((!expression || this.bias) && this.value && (!this.unit || this.unit == "day") && !this.day) {
              this.unit = "day";
              this.day = this.value * 1
            }

            // For parsing: "last minute", "+5 hours", "previous month", "1 year ago tomorrow"
            if (this.unit && (!this[this.unit + "s"] || this.operator)) {
                this[this.unit + "s"] = this.value * orient;
            }

            // For parsing: "July 8th, 2004, 10:30 PM", "07/15/04 6 AM",
            //   "monday @ 8am", "10:30:45 P.M."
            if (this.meridian && this.hour) {
                if (this.meridian == "p" && this.hour < 12) {
                    this.hour = this.hour + 12;
                } else if (this.meridian == "a" && this.hour == 12) {
                    this.hour = 0;
                }
            }

            // For parsing: "3 months ago saturday at 5:00 pm" (does not actually parse)
            if (this.weekday && !this.day && !this.days) {
                var temp = Date[this.weekday]();
                this.day = temp.getDate();
                if (temp.getMonth() !== today.getMonth()) {
                    this.month = temp.getMonth();
                }
            }

            // For parsing: "July 2004", "1997-07", "2008/10", "november"
            if ((this.month || this.month === 0) && !this.day) {
                this.day = 1;
            }

            // For parsing: "3 weeks" (does not actually parse)
            if (!this.orient && !this.operator && this.unit == "week" && this.value && !this.day && !this.month) {
                return Date.today().setWeek(this.value);
            }

            today.set(this);

            if (this.bias) {
              if (this.day) {
                this.days = null
              }

              if (!this.day) {
                if ((this.bias == "past" && today > new Date()) || (this.bias == "future" && today < new Date())) {
                  this.days = 1 * orient
                }
              } else if (!this.month && !this.months) {
                if ((this.bias == "past" && today > new Date()) || (this.bias == "future" && today < new Date())) {
                  this.months = 1 * orient
                }
              } else if (!this.year) {
                if ((this.bias == "past" && today > new Date()) || (this.bias == "future" && today < new Date())) {
                  this.years = 1 * orient
                }
              }

              expression = true;
            }

            if (expression) {
              today.add(this);
            }

            return today;
        }
    };

    var _ = $D.Parsing.Operators, g = $D.Grammar, t = $D.Translator, _fn;

    g.datePartDelimiter = _.rtoken(/^([\s\-\.\,\/\x27]+)/);
    g.timePartDelimiter = _.stoken(":");
    g.whiteSpace = _.rtoken(/^\s*/);
    g.generalDelimiter = _.rtoken(/^(([\s\,]|at|@|on)+)/);

    var _C = {};
    g.ctoken = function (keys) {
        var fn = _C[keys];
        if (! fn) {
            var c = $C.regexPatterns;
            var kx = keys.split(/\s+/), px = [];
            for (var i = 0; i < kx.length ; i++) {
                px.push(_.replace(_.rtoken(c[kx[i]]), kx[i]));
            }
            fn = _C[keys] = _.any.apply(null, px);
        }
        return fn;
    };
    g.ctoken2 = function (key) {
        return _.rtoken($C.regexPatterns[key]);
    };

    // hour, minute, second, meridian, timezone
    g.h = _.cache(_.process(_.rtoken(/^(0[0-9]|1[0-2]|[1-9])/), t.hour));
    g.hh = _.cache(_.process(_.rtoken(/^(0[0-9]|1[0-2])/), t.hour));
    g.H = _.cache(_.process(_.rtoken(/^([0-1][0-9]|2[0-3]|[0-9])/), t.hour));
    g.HH = _.cache(_.process(_.rtoken(/^([0-1][0-9]|2[0-3])/), t.hour));
    g.m = _.cache(_.process(_.rtoken(/^([0-5][0-9]|[0-9])/), t.minute));
    g.mm = _.cache(_.process(_.rtoken(/^[0-5][0-9]/), t.minute));
    g.s = _.cache(_.process(_.rtoken(/^([0-5][0-9]|[0-9])/), t.second));
    g.ss = _.cache(_.process(_.rtoken(/^[0-5][0-9]/), t.second));
    g.fff = _.cache(_.process(_.rtoken(/^[0-9]{3}(?!\d)/), t.millisecond));
    g.hms = _.cache(_.sequence([g.H, g.m, g.s], g.timePartDelimiter));

    // _.min(1, _.set([ g.H, g.m, g.s ], g._t));
    g.t = _.cache(_.process(g.ctoken2("shortMeridian"), t.meridian));
    g.tt = _.cache(_.process(g.ctoken2("longMeridian"), t.meridian));
    g.z = _.cache(_.process(_.rtoken(/^(Z|z)|((\+|\-)\s*\d\d\d\d)|((\+|\-)\d\d(\:?\d\d)?)/), t.timezone));

    g.zzz = _.cache(_.process(g.ctoken2("timezone"), t.timezone));
    g.timeSuffix = _.each(_.ignore(g.whiteSpace), _.set([ g.tt, g.zzz ]));
    g.time = _.each(_.optional(_.ignore(_.stoken("T"))), g.hms, g.timeSuffix);

    // days, months, years
    g.d = _.cache(_.process(_.each(_.rtoken(/^([0-2]\d|3[0-1]|\d)/),
        _.optional(g.ctoken2("ordinalSuffix"))), t.day));
    g.dd = _.cache(_.process(_.each(_.rtoken(/^([0-2]\d|3[0-1])/),
        _.optional(g.ctoken2("ordinalSuffix"))), t.day));
    g.ddd = g.dddd = _.cache(_.process(g.ctoken("sun mon tue wed thu fri sat"),
        function (s) {
            return function () {
                this.weekday = s;
            };
        }
    ));
    g.M = _.cache(_.process(_.rtoken(/^(1[0-2]|0\d|\d)/), t.month));
    g.MM = _.cache(_.process(_.rtoken(/^(1[0-2]|0\d)/), t.month));
    g.MMM = g.MMMM = _.cache(_.process(
        g.ctoken("jan feb mar apr may jun jul aug sep oct nov dec"), t.month));
    g.y = _.cache(_.process(_.rtoken(/^(\d\d?)/), t.year));
    g.yy = _.cache(_.process(_.rtoken(/^(\d\d)/), t.year));
    g.yyy = _.cache(_.process(_.rtoken(/^(\d\d?\d?\d?)/), t.year));
    g.yyyy = _.cache(_.process(_.rtoken(/^(\d\d\d\d)/), t.year));

	// rolling these up into general purpose rules
    _fn = function () {
        return _.each(_.any.apply(null, arguments), _.not(g.ctoken2("timeContext")));
    };

    g.day = _fn(g.d, g.dd);
    g.month = _fn(g.M, g.MMM);
    g.year = _fn(g.yyyy, g.yy);

    // relative date / time expressions
    g.orientation = _.process(g.ctoken("past future"),
        function (s) {
            return function () {
                this.orient = s;
            };
        }
    );
    g.operator = _.process(g.ctoken("add subtract"),
        function (s) {
            return function () {
                this.operator = s;
            };
        }
    );
    g.rday = _.process(g.ctoken("yesterday tomorrow today now"), t.rday);
    g.unit = _.process(g.ctoken("second minute hour day week month year"),
        function (s) {
            return function () {
                this.unit = s;
            };
        }
    );
    g.value = _.process(_.rtoken(/^\d\d?(st|nd|rd|th)?/),
        function (s) {
            return function () {
                this.value = s.replace(/\D/g, "");
            };
        }
    );
    g.expression = _.set([ g.rday, g.operator, g.value, g.unit, g.orientation, g.ddd, g.MMM ]);

    // pre-loaded rules for different date part order preferences
    _fn = function () {
        return  _.set(arguments, g.datePartDelimiter);
    };
    g.mdy = _fn(g.ddd, g.month, g.day, g.year);
    g.ymd = _fn(g.ddd, g.year, g.month, g.day);
    g.dmy = _fn(g.ddd, g.day, g.month, g.year);
    g.date = function (s) {
        return ((g[$C.dateElementOrder] || g.mdy).call(this, s));
    };

    // parsing date format specifiers - ex: "h:m:s tt"
    // this little guy will generate a custom parser based
    // on the format string, ex: g.format("h:m:s tt")
    g.format = _.process(_.many(
        _.any(
        // translate format specifiers into grammar rules
        _.process(
        _.rtoken(/^(dd?d?d?|MM?M?M?|yy?y?y?|hh?|HH?|mm?|ss?|fff|tt?|zz?z?)/),
        function (fmt) {
        if (g[fmt]) {
            return g[fmt];
        } else {
            throw $D.Parsing.Exception(fmt);
        }
    }
    ),
    // translate separator tokens into token rules
    _.process(
    _.rtoken(/^[^dMyhHmsftz]+/), // all legal separators
        function (s) {
            return _.ignore(_.stoken(s));
        }
    )
    )),
        // construct the parser ...
        function (rules) {
            return _.process(_.each.apply(null, rules), t.finishExact);
        }
    );

    var _F = {
		//"M/d/yyyy": function (s) {
		//	var m = s.match(/^([0-2]\d|3[0-1]|\d)\/(1[0-2]|0\d|\d)\/(\d\d\d\d)/);
		//	if (m!=null) {
		//		var r =  [ t.month.call(this,m[1]), t.day.call(this,m[2]), t.year.call(this,m[3]) ];
		//		r = t.finishExact.call(this,r);
		//		return [ r, "" ];
		//	} else {
		//		throw new Date.Parsing.Exception(s);
		//	}
		//}
		//"M/d/yyyy": function (s) { return [ new Date(Date._parse(s)), ""]; }
	};
    var _get = function (f) {
        return _F[f] = (_F[f] || g.format(f)[0]);
    };

    g.formats = function (fx) {
        if (fx instanceof Array) {
            var rx = [];
            for (var i = 0 ; i < fx.length ; i++) {
                rx.push(_get(fx[i]));
            }
            return _.any.apply(null, rx);
        } else {
            return _get(fx);
        }
    };

	// check for these formats first
    g._formats = g.formats([
        "\"yyyy-MM-ddTHH:mm:ss.fffz\"",
        "yyyy-MM-ddTHH:mm:ss.fffz",
        "yyyy-MM-ddTHH:mm:ss.fff",
        "yyyy-MM-ddTHH:mm:ssz",
        "yyyy-MM-ddTHH:mm:ss",
        "yyyy-MM-ddTHH:mmz",
        "yyyy-MM-ddTHH:mm",
        "ddd, MMM dd, yyyy H:mm:ss tt",
        "ddd MMM d yyyy HH:mm:ss zzz",
        "MMddyyyy",
        "ddMMyyyy",
        "Mddyyyy",
        "ddMyyyy",
        "Mdyyyy",
        "dMyyyy",
        "yyyy",
        "Mdyy",
        "dMyy",
        "d"
    ]);

	// starting rule for general purpose grammar
    g._start = _.process(_.set([ g.date, g.time, g.expression ],
        g.generalDelimiter, g.whiteSpace), t.finish);

	// real starting rule: tries selected formats first,
	// then general purpose rule
    g.start = function (s, o) {
        try {
            var r = g._formats.call({}, s);
            if (r[1].length === 0) {
                return r;
            }
        } catch (e) {}
        if (!o) {
          o = {}
        }
        o.input = s;
        return g._start.call(o, s);
    };

	$D._parse = $D.parse;

    /**
     * Converts the specified string value into its JavaScript Date equivalent using CultureInfo specific format information.
     *
     * Example
    <pre><code>
    ///////////
    // Dates //
    ///////////

    // 15-Oct-2004
    var d1 = Date.parse("10/15/2004");

    // 15-Oct-2004
    var d1 = Date.parse("15-Oct-2004");

    // 15-Oct-2004
    var d1 = Date.parse("2004.10.15");

    //Fri Oct 15, 2004
    var d1 = Date.parse("Fri Oct 15, 2004");

    ///////////
    // Times //
    ///////////

    // Today at 10 PM.
    var d1 = Date.parse("10 PM");

    // Today at 10:30 PM.
    var d1 = Date.parse("10:30 P.M.");

    // Today at 6 AM.
    var d1 = Date.parse("06am");

    /////////////////////
    // Dates and Times //
    /////////////////////

    // 8-July-2004 @ 10:30 PM
    var d1 = Date.parse("July 8th, 2004, 10:30 PM");

    // 1-July-2004 @ 10:30 PM
    var d1 = Date.parse("2004-07-01T22:30:00");

    ////////////////////
    // Relative Dates //
    ////////////////////

    // Returns today's date. The string "today" is culture specific.
    var d1 = Date.parse("today");

    // Returns yesterday's date. The string "yesterday" is culture specific.
    var d1 = Date.parse("yesterday");

    // Returns the date of the next thursday.
    var d1 = Date.parse("Next thursday");

    // Returns the date of the most previous monday.
    var d1 = Date.parse("last monday");

    // Returns today's day + one year.
    var d1 = Date.parse("next year");

    ///////////////
    // Date Math //
    ///////////////

    // Today + 2 days
    var d1 = Date.parse("t+2");

    // Today + 2 days
    var d1 = Date.parse("today + 2 days");

    // Today + 3 months
    var d1 = Date.parse("t+3m");

    // Today - 1 year
    var d1 = Date.parse("today - 1 year");

    // Today - 1 year
    var d1 = Date.parse("t-1y");


    /////////////////////////////
    // Partial Dates and Times //
    /////////////////////////////

    // July 15th of this year.
    var d1 = Date.parse("July 15");

    // 15th day of current day and year.
    var d1 = Date.parse("15");

    // July 1st of current year at 10pm.
    var d1 = Date.parse("7/1 10pm");
    </code></pre>
     *
     * @param {String}   The string value to convert into a Date object [Required]
     * @param {Object}   An object with any defaults for parsing [Optional]
     * @return {Date}    A Date object or null if the string cannot be converted into a Date.
     */
    $D.parse = function (s, o) {
        var r = null;
        if (!s) {
            return null;
        }
        if (s instanceof Date) {
            return s;
        }
        if (!o) {
          o = {}
        }
        try {
            r = $D.Grammar.start.call({}, s.replace(/^\s*(\S*(\s+\S+)*)\s*$/, "$1"), o);
        } catch (e) {
            return null;
        }
        return ((r[1].length === 0) ? r[0] : null);
    };

    $D.getParseFunction = function (fx) {
        var fn = $D.Grammar.formats(fx);
        return function (s) {
            var r = null;
            try {
                r = fn.call({}, s);
            } catch (e) {
                return null;
            }
            return ((r[1].length === 0) ? r[0] : null);
        };
    };

    /**
     * Converts the specified string value into its JavaScript Date equivalent using the specified format {String} or formats {Array} and the CultureInfo specific format information.
     * The format of the string value must match one of the supplied formats exactly.
     *
     * Example
    <pre><code>
    // 15-Oct-2004
    var d1 = Date.parseExact("10/15/2004", "M/d/yyyy");

    // 15-Oct-2004
    var d1 = Date.parse("15-Oct-2004", "M-ddd-yyyy");

    // 15-Oct-2004
    var d1 = Date.parse("2004.10.15", "yyyy.MM.dd");

    // Multiple formats
    var d1 = Date.parseExact("10/15/2004", ["M/d/yyyy", "MMMM d, yyyy"]);
    </code></pre>
     *
     * @param {String}   The string value to convert into a Date object [Required].
     * @param {Object}   The expected format {String} or an array of expected formats {Array} of the date string [Required].
     * @return {Date}    A Date object or null if the string cannot be converted into a Date.
     */
    $D.parseExact = function (s, fx) {
        return $D.getParseFunction(fx)(s);
    };
}());
/**
 * @version: 1.0 Alpha-1
 * @author: Coolite Inc. http://www.coolite.com/
 * @date: 2008-04-13
 * @copyright: Copyright (c) 2006-2008, Coolite Inc. (http://www.coolite.com/). All rights reserved.
 * @license: Licensed under The MIT License. See license.txt and http://www.datejs.com/license/.
 * @website: http://www.datejs.com/
 */

(function () {
    var $D = Date,
            $P = $D.prototype,
            $C = $D.CultureInfo,
            p = function (s, l) {
                if (!l) {
                    l = 2;
                }
                return ("000" + s).slice(l * -1);
            };

    /**
     * Resets the time of this Date object to 12:00 AM (00:00), which is the start of the day.
     * @param {Boolean}  .clone() this date instance before clearing Time
     * @return {Date}    this
     */
    $P.clearTime = function () {
        this.setHours(0);
        this.setMinutes(0);
        this.setSeconds(0);
        this.setMilliseconds(0);
        return this;
    };

    /**
     * Resets the time of this Date object to the current time ('now').
     * @return {Date}    this
     */
    $P.setTimeToNow = function () {
        var n = new Date();
        this.setHours(n.getHours());
        this.setMinutes(n.getMinutes());
        this.setSeconds(n.getSeconds());
        this.setMilliseconds(n.getMilliseconds());
        return this;
    };

    /**
     * Gets a date that is set to the current date. The time is set to the start of the day (00:00 or 12:00 AM).
     * @return {Date}    The current date.
     */
    $D.today = function () {
        return new Date().clearTime();
    };

    /**
     * Compares the first date to the second date and returns an number indication of their relative values.
     * @param {Date}     First Date object to compare [Required].
     * @param {Date}     Second Date object to compare to [Required].
     * @return {Number}  -1 = date1 is lessthan date2. 0 = values are equal. 1 = date1 is greaterthan date2.
     */
    $D.compare = function (date1, date2) {
        if (isNaN(date1) || isNaN(date2)) {
            throw new Error(date1 + " - " + date2);
        } else if (date1 instanceof Date && date2 instanceof Date) {
            return (date1 < date2) ? -1 : (date1 > date2) ? 1 : 0;
        } else {
            throw new TypeError(date1 + " - " + date2);
        }
    };

    /**
     * Compares the first Date object to the second Date object and returns true if they are equal.
     * @param {Date}     First Date object to compare [Required]
     * @param {Date}     Second Date object to compare to [Required]
     * @return {Boolean} true if dates are equal. false if they are not equal.
     */
    $D.equals = function (date1, date2) {
        return (date1.compareTo(date2) === 0);
    };

    /**
     * Gets the day number (0-6) if given a CultureInfo specific string which is a valid dayName, abbreviatedDayName or shortestDayName (two char).
     * @param {String}   The name of the day (eg. "Monday, "Mon", "tuesday", "tue", "We", "we").
     * @return {Number}  The day number
     */
    $D.getDayNumberFromName = function (name) {
        var n = $C.dayNames, m = $C.abbreviatedDayNames, o = $C.shortestDayNames, s = name.toLowerCase();
        for (var i = 0; i < n.length; i++) {
            if (n[i].toLowerCase() == s || m[i].toLowerCase() == s || o[i].toLowerCase() == s) {
                return i;
            }
        }
        return -1;
    };

    /**
     * Gets the month number (0-11) if given a Culture Info specific string which is a valid monthName or abbreviatedMonthName.
     * @param {String}   The name of the month (eg. "February, "Feb", "october", "oct").
     * @return {Number}  The day number
     */
    $D.getMonthNumberFromName = function (name) {
        var n = $C.monthNames, m = $C.abbreviatedMonthNames, s = name.toLowerCase();
        for (var i = 0; i < n.length; i++) {
            if (n[i].toLowerCase() == s || m[i].toLowerCase() == s) {
                return i;
            }
        }
        return -1;
    };

    /**
     * Determines if the current date instance is within a LeapYear.
     * @param {Number}   The year.
     * @return {Boolean} true if date is within a LeapYear, otherwise false.
     */
    $D.isLeapYear = function (year) {
        return ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0);
    };

    /**
     * Gets the number of days in the month, given a year and month value. Automatically corrects for LeapYear.
     * @param {Number}   The year.
     * @param {Number}   The month (0-11).
     * @return {Number}  The number of days in the month.
     */
    $D.getDaysInMonth = function (year, month) {
        return [31, ($D.isLeapYear(year) ? 29 : 28), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month];
    };

    $D.getTimezoneAbbreviation = function (offset) {
        var z = $C.timezones, p;
        for (var i = 0; i < z.length; i++) {
            if (z[i].offset === offset) {
                return z[i].name;
            }
        }
        return null;
    };

    $D.getTimezoneOffset = function (name) {
        var z = $C.timezones, p;
        for (var i = 0; i < z.length; i++) {
            if (z[i].name === name.toUpperCase()) {
                return z[i].offset;
            }
        }
        return null;
    };

    /**
     * Returns a new Date object that is an exact date and time copy of the original instance.
     * @return {Date}    A new Date instance
     */
    $P.clone = function () {
        return new Date(this.getTime());
    };

    /**
     * Compares this instance to a Date object and returns an number indication of their relative values.
     * @param {Date}     Date object to compare [Required]
     * @return {Number}  -1 = this is lessthan date. 0 = values are equal. 1 = this is greaterthan date.
     */
    $P.compareTo = function (date) {
        return Date.compare(this, date);
    };

    /**
     * Compares this instance to another Date object and returns true if they are equal.
     * @param {Date}     Date object to compare. If no date to compare, new Date() [now] is used.
     * @return {Boolean} true if dates are equal. false if they are not equal.
     */
    $P.equals = function (date) {
        return Date.equals(this, date || new Date());
    };

    /**
     * Determines if this instance is between a range of two dates or equal to either the start or end dates.
     * @param {Date}     Start of range [Required]
     * @param {Date}     End of range [Required]
     * @return {Boolean} true is this is between or equal to the start and end dates, else false
     */
    $P.between = function (start, end) {
        return this.getTime() >= start.getTime() && this.getTime() <= end.getTime();
    };

    /**
     * Determines if this date occurs after the date to compare to.
     * @param {Date}     Date object to compare. If no date to compare, new Date() ("now") is used.
     * @return {Boolean} true if this date instance is greater than the date to compare to (or "now"), otherwise false.
     */
    $P.isAfter = function (date) {
        return this.compareTo(date || new Date()) === 1;
    };

    /**
     * Determines if this date occurs before the date to compare to.
     * @param {Date}     Date object to compare. If no date to compare, new Date() ("now") is used.
     * @return {Boolean} true if this date instance is less than the date to compare to (or "now").
     */
    $P.isBefore = function (date) {
        return (this.compareTo(date || new Date()) === -1);
    };

    /**
     * Determines if the current Date instance occurs today.
     * @return {Boolean} true if this date instance is 'today', otherwise false.
     */

    /**
     * Determines if the current Date instance occurs on the same Date as the supplied 'date'.
     * If no 'date' to compare to is provided, the current Date instance is compared to 'today'.
     * @param {date}     Date object to compare. If no date to compare, the current Date ("now") is used.
     * @return {Boolean} true if this Date instance occurs on the same Day as the supplied 'date'.
     */
    $P.isToday = $P.isSameDay = function (date) {
        return this.clone().clearTime().equals((date || new Date()).clone().clearTime());
    };

    /**
     * Adds the specified number of milliseconds to this instance.
     * @param {Number}   The number of milliseconds to add. The number can be positive or negative [Required]
     * @return {Date}    this
     */
    $P.addMilliseconds = function (value) {
        this.setMilliseconds(this.getMilliseconds() + value * 1);
        return this;
    };

    /**
     * Adds the specified number of seconds to this instance.
     * @param {Number}   The number of seconds to add. The number can be positive or negative [Required]
     * @return {Date}    this
     */
    $P.addSeconds = function (value) {
        return this.addMilliseconds(value * 1000);
    };

    /**
     * Adds the specified number of seconds to this instance.
     * @param {Number}   The number of seconds to add. The number can be positive or negative [Required]
     * @return {Date}    this
     */
    $P.addMinutes = function (value) {
        return this.addMilliseconds(value * 60000); /* 60*1000 */
    };

    /**
     * Adds the specified number of hours to this instance.
     * @param {Number}   The number of hours to add. The number can be positive or negative [Required]
     * @return {Date}    this
     */
    $P.addHours = function (value) {
        return this.addMilliseconds(value * 3600000); /* 60*60*1000 */
    };

    /**
     * Adds the specified number of days to this instance.
     * @param {Number}   The number of days to add. The number can be positive or negative [Required]
     * @return {Date}    this
     */
    $P.addDays = function (value) {
        this.setDate(this.getDate() + value * 1);
        return this;
    };

    /**
     * Adds the specified number of weeks to this instance.
     * @param {Number}   The number of weeks to add. The number can be positive or negative [Required]
     * @return {Date}    this
     */
    $P.addWeeks = function (value) {
        return this.addDays(value * 7);
    };

    /**
     * Adds the specified number of months to this instance.
     * @param {Number}   The number of months to add. The number can be positive or negative [Required]
     * @return {Date}    this
     */
    $P.addMonths = function (value) {
        var n = this.getDate();
        this.setDate(1);
        this.setMonth(this.getMonth() + value * 1);
        this.setDate(Math.min(n, $D.getDaysInMonth(this.getFullYear(), this.getMonth())));
        return this;
    };

    /**
     * Adds the specified number of years to this instance.
     * @param {Number}   The number of years to add. The number can be positive or negative [Required]
     * @return {Date}    this
     */
    $P.addYears = function (value) {
        return this.addMonths(value * 12);
    };

    /**
     * Adds (or subtracts) to the value of the years, months, weeks, days, hours, minutes, seconds, milliseconds of the date instance using given configuration object. Positive and Negative values allowed.
     * Example
     <pre><code>
     Date.today().add( { days: 1, months: 1 } )

     new Date().add( { years: -1 } )
     </code></pre>
     * @param {Object}   Configuration object containing attributes (months, days, etc.)
     * @return {Date}    this
     */
    $P.add = function (config) {
        if (typeof config == "number") {
            this._orient = config;
            return this;
        }

        var x = config;

        if (x.milliseconds) {
            this.addMilliseconds(x.milliseconds);
        }
        if (x.seconds) {
            this.addSeconds(x.seconds);
        }
        if (x.minutes) {
            this.addMinutes(x.minutes);
        }
        if (x.hours) {
            this.addHours(x.hours);
        }
        if (x.weeks) {
            this.addWeeks(x.weeks);
        }
        if (x.months) {
            this.addMonths(x.months);
        }
        if (x.years) {
            this.addYears(x.years);
        }
        if (x.days) {
            this.addDays(x.days);
        }
        return this;
    };

    var $y, $m, $d;

    /**
     * Get the week number. Week one (1) is the week which contains the first Thursday of the year. Monday is considered the first day of the week.
     * This algorithm is a JavaScript port of the work presented by Claus T�ndering at http://www.tondering.dk/claus/cal/node8.html#SECTION00880000000000000000
     * .getWeek() Algorithm Copyright (c) 2008 Claus Tondering.
     * The .getWeek() function does NOT convert the date to UTC. The local datetime is used. Please use .getISOWeek() to get the week of the UTC converted date.
     * @return {Number}  1 to 53
     */
    $P.getWeek = function () {
        var a, b, c, d, e, f, g, n, s, w;

        $y = (!$y) ? this.getFullYear() : $y;
        $m = (!$m) ? this.getMonth() + 1 : $m;
        $d = (!$d) ? this.getDate() : $d;

        if ($m <= 2) {
            a = $y - 1;
            b = (a / 4 | 0) - (a / 100 | 0) + (a / 400 | 0);
            c = ((a - 1) / 4 | 0) - ((a - 1) / 100 | 0) + ((a - 1) / 400 | 0);
            s = b - c;
            e = 0;
            f = $d - 1 + (31 * ($m - 1));
        } else {
            a = $y;
            b = (a / 4 | 0) - (a / 100 | 0) + (a / 400 | 0);
            c = ((a - 1) / 4 | 0) - ((a - 1) / 100 | 0) + ((a - 1) / 400 | 0);
            s = b - c;
            e = s + 1;
            f = $d + ((153 * ($m - 3) + 2) / 5) + 58 + s;
        }

        g = (a + b) % 7;
        d = (f + g - e) % 7;
        n = (f + 3 - d) | 0;

        if (n < 0) {
            w = 53 - ((g - s) / 5 | 0);
        } else if (n > 364 + s) {
            w = 1;
        } else {
            w = (n / 7 | 0) + 1;
        }

        $y = $m = $d = null;

        return w;
    };

    /**
     * Get the ISO 8601 week number. Week one ("01") is the week which contains the first Thursday of the year. Monday is considered the first day of the week.
     * The .getISOWeek() function does convert the date to it's UTC value. Please use .getWeek() to get the week of the local date.
     * @return {String}  "01" to "53"
     */
    $P.getISOWeek = function () {
        $y = this.getUTCFullYear();
        $m = this.getUTCMonth() + 1;
        $d = this.getUTCDate();
        return p(this.getWeek());
    };

    /**
     * Moves the date to Monday of the week set. Week one (1) is the week which contains the first Thursday of the year.
     * @param {Number}   A Number (1 to 53) that represents the week of the year.
     * @return {Date}    this
     */
    $P.setWeek = function (n) {
        return this.moveToDayOfWeek(1).addWeeks(n - this.getWeek());
    };

    // private
    var validate = function (n, min, max, name) {
        if (typeof n == "undefined" || n == null) {
            return false;
        } else if (typeof n != "number") {
            throw new TypeError(n + " is not a Number.");
        } else if (n < min || n > max) {
            throw new RangeError(n + " is not a valid value for " + name + ".");
        }
        return true;
    };

    /**
     * Validates the number is within an acceptable range for milliseconds [0-999].
     * @param {Number}   The number to check if within range.
     * @return {Boolean} true if within range, otherwise false.
     */
    $D.validateMillisecond = function (value) {
        return validate(value, 0, 999, "millisecond");
    };

    /**
     * Validates the number is within an acceptable range for seconds [0-59].
     * @param {Number}   The number to check if within range.
     * @return {Boolean} true if within range, otherwise false.
     */
    $D.validateSecond = function (value) {
        return validate(value, 0, 59, "second");
    };

    /**
     * Validates the number is within an acceptable range for minutes [0-59].
     * @param {Number}   The number to check if within range.
     * @return {Boolean} true if within range, otherwise false.
     */
    $D.validateMinute = function (value) {
        return validate(value, 0, 59, "minute");
    };

    /**
     * Validates the number is within an acceptable range for hours [0-23].
     * @param {Number}   The number to check if within range.
     * @return {Boolean} true if within range, otherwise false.
     */
    $D.validateHour = function (value) {
        return validate(value, 0, 23, "hour");
    };

    /**
     * Validates the number is within an acceptable range for the days in a month [0-MaxDaysInMonth].
     * @param {Number}   The number to check if within range.
     * @return {Boolean} true if within range, otherwise false.
     */
    $D.validateDay = function (value, year, month) {
        return validate(value, 1, $D.getDaysInMonth(year, month), "day");
    };

    /**
     * Validates the number is within an acceptable range for months [0-11].
     * @param {Number}   The number to check if within range.
     * @return {Boolean} true if within range, otherwise false.
     */
    $D.validateMonth = function (value) {
        return validate(value, 0, 11, "month");
    };

    /**
     * Validates the number is within an acceptable range for years.
     * @param {Number}   The number to check if within range.
     * @return {Boolean} true if within range, otherwise false.
     */
    $D.validateYear = function (value) {
        return validate(value, 0, 9999, "year");
    };

    /**
     * Set the value of year, month, day, hour, minute, second, millisecond of date instance using given configuration object.
     * Example
     <pre><code>
     Date.today().set( { day: 20, month: 1 } )

     new Date().set( { millisecond: 0 } )
     </code></pre>
     *
     * @param {Object}   Configuration object containing attributes (month, day, etc.)
     * @return {Date}    this
     */
    $P.set = function (config) {
        if ($D.validateMillisecond(config.millisecond)) {
            this.addMilliseconds(config.millisecond - this.getMilliseconds());
        }

        if ($D.validateSecond(config.second)) {
            this.addSeconds(config.second - this.getSeconds());
        }

        if ($D.validateMinute(config.minute)) {
            this.addMinutes(config.minute - this.getMinutes());
        }

        if ($D.validateHour(config.hour)) {
            this.addHours(config.hour - this.getHours());
        }

        if ($D.validateMonth(config.month)) {
            this.addMonths(config.month - this.getMonth());
        }

        if ($D.validateYear(config.year)) {
            this.addYears(config.year - this.getFullYear());
        }

        /* day has to go last because you can't validate the day without first knowing the month */
        if ($D.validateDay(config.day, this.getFullYear(), this.getMonth())) {
            this.addDays(config.day - this.getDate());
        }

        if (config.timezone) {
            this.setTimezone(config.timezone);
        }

        if (config.timezoneOffset) {
            this.setTimezoneOffset(config.timezoneOffset);
        }

        if (config.week && validate(config.week, 0, 53, "week")) {
            this.setWeek(config.week);
        }

        return this;
    };

    /**
     * Moves the date to the first day of the month.
     * @return {Date}    this
     */
    $P.moveToFirstDayOfMonth = function () {
        return this.set({ day: 1 });
    };

    /**
     * Moves the date to the last day of the month.
     * @return {Date}    this
     */
    $P.moveToLastDayOfMonth = function () {
        return this.set({ day: $D.getDaysInMonth(this.getFullYear(), this.getMonth())});
    };

    /**
     * Moves the date to the next n'th occurrence of the dayOfWeek starting from the beginning of the month. The number (-1) is a magic number and will return the last occurrence of the dayOfWeek in the month.
     * @param {Number}   The dayOfWeek to move to
     * @param {Number}   The n'th occurrence to move to. Use (-1) to return the last occurrence in the month
     * @return {Date}    this
     */
    $P.moveToNthOccurrence = function (dayOfWeek, occurrence) {
        var shift = 0;
        if (occurrence > 0) {
            shift = occurrence - 1;
        }
        else if (occurrence === -1) {
            this.moveToLastDayOfMonth();
            if (this.getDay() !== dayOfWeek) {
                this.moveToDayOfWeek(dayOfWeek, -1);
            }
            return this;
        }
        return this.moveToFirstDayOfMonth().addDays(-1).moveToDayOfWeek(dayOfWeek, +1).addWeeks(shift);
    };

    /**
     * Move to the next or last dayOfWeek based on the orient value.
     * @param {Number}   The dayOfWeek to move to
     * @param {Number}   Forward (+1) or Back (-1). Defaults to +1. [Optional]
     * @return {Date}    this
     */
    $P.moveToDayOfWeek = function (dayOfWeek, orient) {
        var diff = (dayOfWeek - this.getDay() + 7 * (orient || +1)) % 7;
        return this.addDays((diff === 0) ? diff += 7 * (orient || +1) : diff);
    };

    /**
     * Move to the next or last month based on the orient value.
     * @param {Number}   The month to move to. 0 = January, 11 = December
     * @param {Number}   Forward (+1) or Back (-1). Defaults to +1. [Optional]
     * @return {Date}    this
     */
    $P.moveToMonth = function (month, orient) {
        var diff = (month - this.getMonth() + 12 * (orient || +1)) % 12;
        return this.addMonths((diff === 0) ? diff += 12 * (orient || +1) : diff);
    };

    /**
     * Get the Ordinal day (numeric day number) of the year, adjusted for leap year.
     * @return {Number} 1 through 365 (366 in leap years)
     */
    $P.getOrdinalNumber = function () {
        return Math.ceil((this.clone().clearTime() - new Date(this.getFullYear(), 0, 1)) / 86400000) + 1;
    };

    /**
     * Get the time zone abbreviation of the current date.
     * @return {String} The abbreviated time zone name (e.g. "EST")
     */
    $P.getTimezone = function () {
        return $D.getTimezoneAbbreviation(this.getUTCOffset());
    };

    $P.setTimezoneOffset = function (offset) {
        var here = this.getTimezoneOffset(), there = Number(offset) * -6 / 10;
        return this.addMinutes(there - here);
    };

    $P.setTimezone = function (offset) {
        return this.setTimezoneOffset($D.getTimezoneOffset(offset));
    };

    /**
     * Indicates whether Daylight Saving Time is observed in the current time zone.
     * @return {Boolean} true|false
     */
    $P.hasDaylightSavingTime = function () {
        return (Date.today().set({month: 0, day: 1}).getTimezoneOffset() !== Date.today().set({month: 6, day: 1}).getTimezoneOffset());
    };

    /**
     * Indicates whether this Date instance is within the Daylight Saving Time range for the current time zone.
     * @return {Boolean} true|false
     */
    $P.isDaylightSavingTime = function () {
        return Date.today().set({month: 0, day: 1}).getTimezoneOffset() != this.getTimezoneOffset();
    };

    /**
     * Get the offset from UTC of the current date.
     * @return {String} The 4-character offset string prefixed with + or - (e.g. "-0500")
     */
    $P.getUTCOffset = function () {
        var n = this.getTimezoneOffset() * -10 / 6, r;
        if (n < 0) {
            r = (n - 10000).toString();
            return r.charAt(0) + r.substr(2);
        } else {
            r = (n + 10000).toString();
            return "+" + r.substr(1);
        }
    };

    /**
     * Returns the number of milliseconds between this date and date.
     * @param {Date} Defaults to now
     * @return {Number} The diff in milliseconds
     */
    $P.getElapsed = function (date) {
        return (date || new Date()) - this;
    };

    if (!$P.toISOString) {
        /**
         * Converts the current date instance into a string with an ISO 8601 format. The date is converted to it's UTC value.
         * @return {String}  ISO 8601 string of date
         */
        $P.toISOString = function () {
            // From http://www.json.org/json.js. Public Domain.
            function f(n) {
                return n < 10 ? '0' + n : n;
            }
            function h(i){
                return i.length < 2 ? "00" + i :
                        i.length < 3 ? "0" + i :
                                3 < i.length ? Math.round(i/Math.pow(10,i.length-3)) : i
            }

            return '"' + this.getUTCFullYear()   + '-' +
                    f(this.getUTCMonth() + 1) + '-' +
                    f(this.getUTCDate())      + 'T' +
                    f(this.getUTCHours())     + ':' +
                    f(this.getUTCMinutes())   + ':' +
                    f(this.getUTCSeconds())   + '.' +
                    h(this.getUTCMilliseconds()) + 'Z"';
        };
    }

    // private
    $P._toString = $P.toString;

    /**
     * Converts the value of the current Date object to its equivalent string representation.
     * Format Specifiers
     <pre>
     CUSTOM DATE AND TIME FORMAT STRINGS
     Format  Description                                                                  Example
     ------  ---------------------------------------------------------------------------  -----------------------
     s      The seconds of the minute between 0-59.                                      "0" to "59"
     ss     The seconds of the minute with leading zero if required.                     "00" to "59"

     m      The minute of the hour between 0-59.                                         "0"  or "59"
     mm     The minute of the hour with leading zero if required.                        "00" or "59"

     h      The hour of the day between 1-12.                                            "1"  to "12"
     hh     The hour of the day with leading zero if required.                           "01" to "12"

     H      The hour of the day between 0-23.                                            "0"  to "23"
     HH     The hour of the day with leading zero if required.                           "00" to "23"

     d      The day of the month between 1 and 31.                                       "1"  to "31"
     dd     The day of the month with leading zero if required.                          "01" to "31"
     ddd    Abbreviated day name. $C.abbreviatedDayNames.                                "Mon" to "Sun"
     dddd   The full day name. $C.dayNames.                                              "Monday" to "Sunday"

     M      The month of the year between 1-12.                                          "1" to "12"
     MM     The month of the year with leading zero if required.                         "01" to "12"
     MMM    Abbreviated month name. $C.abbreviatedMonthNames.                            "Jan" to "Dec"
     MMMM   The full month name. $C.monthNames.                                          "January" to "December"

     yy     The year as a two-digit number.                                              "99" or "08"
     yyyy   The full four digit year.                                                    "1999" or "2008"

     t      Displays the first character of the A.M./P.M. designator.                    "A" or "P"
     $C.amDesignator or $C.pmDesignator
     tt     Displays the A.M./P.M. designator.                                           "AM" or "PM"
     $C.amDesignator or $C.pmDesignator

     S      The ordinal suffix ("st, "nd", "rd" or "th") of the current day.            "st, "nd", "rd" or "th"

     || *Format* || *Description* || *Example* ||
     || d      || The CultureInfo shortDate Format Pattern                                     || "M/d/yyyy" ||
     || D      || The CultureInfo longDate Format Pattern                                      || "dddd, MMMM dd, yyyy" ||
     || F      || The CultureInfo fullDateTime Format Pattern                                  || "dddd, MMMM dd, yyyy h:mm:ss tt" ||
     || m      || The CultureInfo monthDay Format Pattern                                      || "MMMM dd" ||
     || r      || The CultureInfo rfc1123 Format Pattern                                       || "ddd, dd MMM yyyy HH:mm:ss GMT" ||
     || s      || The CultureInfo sortableDateTime Format Pattern                              || "yyyy-MM-ddTHH:mm:ss" ||
     || t      || The CultureInfo shortTime Format Pattern                                     || "h:mm tt" ||
     || T      || The CultureInfo longTime Format Pattern                                      || "h:mm:ss tt" ||
     || u      || The CultureInfo universalSortableDateTime Format Pattern                     || "yyyy-MM-dd HH:mm:ssZ" ||
     || y      || The CultureInfo yearMonth Format Pattern                                     || "MMMM, yyyy" ||


     STANDARD DATE AND TIME FORMAT STRINGS
     Format  Description                                                                  Example ("en-US")
     ------  ---------------------------------------------------------------------------  -----------------------
     d      The CultureInfo shortDate Format Pattern                                     "M/d/yyyy"
     D      The CultureInfo longDate Format Pattern                                      "dddd, MMMM dd, yyyy"
     F      The CultureInfo fullDateTime Format Pattern                                  "dddd, MMMM dd, yyyy h:mm:ss tt"
     m      The CultureInfo monthDay Format Pattern                                      "MMMM dd"
     r      The CultureInfo rfc1123 Format Pattern                                       "ddd, dd MMM yyyy HH:mm:ss GMT"
     s      The CultureInfo sortableDateTime Format Pattern                              "yyyy-MM-ddTHH:mm:ss"
     t      The CultureInfo shortTime Format Pattern                                     "h:mm tt"
     T      The CultureInfo longTime Format Pattern                                      "h:mm:ss tt"
     u      The CultureInfo universalSortableDateTime Format Pattern                     "yyyy-MM-dd HH:mm:ssZ"
     y      The CultureInfo yearMonth Format Pattern                                     "MMMM, yyyy"
     </pre>
     * @param {String}   A format string consisting of one or more format spcifiers [Optional].
     * @return {String}  A string representation of the current Date object.
     */
    $P.toString = function (format) {
        var x = this;

        // Standard Date and Time Format Strings. Formats pulled from CultureInfo file and
        // may vary by culture.
        if (format && format.length == 1) {
            var c = $C.formatPatterns;
            x.t = x.toString;
            switch (format) {
                case "d":
                    return x.t(c.shortDate);
                case "D":
                    return x.t(c.longDate);
                case "F":
                    return x.t(c.fullDateTime);
                case "m":
                    return x.t(c.monthDay);
                case "r":
                    return x.t(c.rfc1123);
                case "s":
                    return x.t(c.sortableDateTime);
                case "t":
                    return x.t(c.shortTime);
                case "T":
                    return x.t(c.longTime);
                case "u":
                    return x.t(c.universalSortableDateTime);
                case "y":
                    return x.t(c.yearMonth);
            }
        }

        var ord = function (n) {
            switch (n * 1) {
                case 1:
                case 21:
                case 31:
                    return "st";
                case 2:
                case 22:
                    return "nd";
                case 3:
                case 23:
                    return "rd";
                default:
                    return "th";
            }
        };

        return format ? format.replace(/(\\)?(dd?d?d?|MM?M?M?|yy?y?y?|hh?|HH?|mm?|ss?|tt?|S)/g,
                function (m) {
                    if (m.charAt(0) === "\\") {
                        return m.replace("\\", "");
                    }
                    x.h = x.getHours;
                    switch (m) {
                        case "hh":
                            return p(x.h() < 13 ? (x.h() === 0 ? 12 : x.h()) : (x.h() - 12));
                        case "h":
                            return x.h() < 13 ? (x.h() === 0 ? 12 : x.h()) : (x.h() - 12);
                        case "HH":
                            return p(x.h());
                        case "H":
                            return x.h();
                        case "mm":
                            return p(x.getMinutes());
                        case "m":
                            return x.getMinutes();
                        case "ss":
                            return p(x.getSeconds());
                        case "s":
                            return x.getSeconds();
                        case "yyyy":
                            return p(x.getFullYear(), 4);
                        case "yy":
                            return p(x.getFullYear());
                        case "dddd":
                            return $C.dayNames[x.getDay()];
                        case "ddd":
                            return $C.abbreviatedDayNames[x.getDay()];
                        case "dd":
                            return p(x.getDate());
                        case "d":
                            return x.getDate();
                        case "MMMM":
                            return $C.monthNames[x.getMonth()];
                        case "MMM":
                            return $C.abbreviatedMonthNames[x.getMonth()];
                        case "MM":
                            return p((x.getMonth() + 1));
                        case "M":
                            return x.getMonth() + 1;
                        case "t":
                            return x.h() < 12 ? $C.amDesignator.substring(0, 1) : $C.pmDesignator.substring(0, 1);
                        case "tt":
                            return x.h() < 12 ? $C.amDesignator : $C.pmDesignator;
                        case "S":
                            return ord(x.getDate());
                        default:
                            return m;
                    }
                }
        ) : this._toString();
    };
}());
/**
 * @version: 1.0 Alpha-1
 * @author: Coolite Inc. http://www.coolite.com/
 * @date: 2008-04-13
 * @copyright: Copyright (c) 2006-2008, Coolite Inc. (http://www.coolite.com/). All rights reserved.
 * @license: Licensed under The MIT License. See license.txt and http://www.datejs.com/license/. 
 * @website: http://www.datejs.com/
 */
 
(function () {
    var $D = Date, 
        $P = $D.prototype, 
        $C = $D.CultureInfo,
        $f = [],
        p = function (s, l) {
            if (!l) {
                l = 2;
            }
            return ("000" + s).slice(l * -1);
        };

    /**
     * Converts a PHP format string to Java/.NET format string. 
     * A PHP format string can be used with .$format or .format.
     * A Java/.NET format string can be used with .toString().
     * The .parseExact function will only accept a Java/.NET format string
     *
     * Example
     <pre>
     var f1 = "%m/%d/%y"
     var f2 = Date.normalizeFormat(f1); // "MM/dd/yy"
     
     new Date().format(f1);    // "04/13/08"
     new Date().$format(f1);   // "04/13/08"
     new Date().toString(f2);  // "04/13/08"
     
     var date = Date.parseExact("04/13/08", f2); // Sun Apr 13 2008
     </pre>
     * @param {String}   A PHP format string consisting of one or more format spcifiers.
     * @return {String}  The PHP format converted to a Java/.NET format string.
     */        
    $D.normalizeFormat = function (format) {
        $f = [];
        var t = new Date().$format(format);
        return $f.join("");
    };

    /**
     * Format a local Unix timestamp according to locale settings
     * 
     * Example
     <pre>
     Date.strftime("%m/%d/%y", new Date());       // "04/13/08"
     Date.strftime("c", "2008-04-13T17:52:03Z");  // "04/13/08"
     </pre>
     * @param {String}   A format string consisting of one or more format spcifiers [Optional].
     * @param {Number}   The number representing the number of seconds that have elapsed since January 1, 1970 (local time). 
     * @return {String}  A string representation of the current Date object.
     */
    $D.strftime = function (format, time) {
        return new Date(time * 1000).$format(format);
    };

    /**
     * Parse any textual datetime description into a Unix timestamp. 
     * A Unix timestamp is the number of seconds that have elapsed since January 1, 1970 (midnight UTC/GMT).
     * 
     * Example
     <pre>
     Date.strtotime("04/13/08");              // 1208044800
     Date.strtotime("1970-01-01T00:00:00Z");  // 0
     </pre>
     * @param {String}   A format string consisting of one or more format spcifiers [Optional].
     * @param {Object}   A string or date object.
     * @return {String}  A string representation of the current Date object.
     */
    $D.strtotime = function (time) {
        var d = $D.parse(time);
        d.addMinutes(d.getTimezoneOffset() * -1);
        return Math.round($D.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds(), d.getUTCMilliseconds()) / 1000);
    };

    /**
     * Converts the value of the current Date object to its equivalent string representation using a PHP/Unix style of date format specifiers.
     *
     * The following descriptions are from http://www.php.net/strftime and http://www.php.net/manual/en/function.date.php. 
     * Copyright � 2001-2008 The PHP Group
     * 
     * Format Specifiers
     <pre>
    Format  Description                                                                  Example
    ------  ---------------------------------------------------------------------------  -----------------------
     %a     abbreviated weekday name according to the current localed                    "Mon" through "Sun"
     %A     full weekday name according to the current locale                            "Sunday" through "Saturday"
     %b     abbreviated month name according to the current locale                       "Jan" through "Dec"
     %B     full month name according to the current locale                              "January" through "December"
     %c     preferred date and time representation for the current locale                "4/13/2008 12:33 PM"
     %C     century number (the year divided by 100 and truncated to an integer)         "00" to "99"
     %d     day of the month as a decimal number                                         "01" to "31"
     %D     same as %m/%d/%y                                                             "04/13/08"
     %e     day of the month as a decimal number, a single digit is preceded by a space  "1" to "31"
     %g     like %G, but without the century                                             "08"
     %G     The 4-digit year corresponding to the ISO week number (see %V).              "2008"
            This has the same format and value as %Y, except that if the ISO week number 
            belongs to the previous or next year, that year is used instead.
     %h     same as %b                                                                   "Jan" through "Dec"
     %H     hour as a decimal number using a 24-hour clock                               "00" to "23"
     %I     hour as a decimal number using a 12-hour clock                               "01" to "12"
     %j     day of the year as a decimal number                                          "001" to "366"
     %m     month as a decimal number                                                    "01" to "12"
     %M     minute as a decimal number                                                   "00" to "59"
     %n     newline character                                                            "\n"
     %p     either "am" or "pm" according to the given time value, or the                "am" or "pm"
            corresponding strings for the current locale
     %r     time in a.m. and p.m. notation                                               "8:44 PM"
     %R     time in 24 hour notation                                                     "20:44"
     %S     second as a decimal number                                                   "00" to "59"
     %t     tab character                                                                "\t"
     %T     current time, equal to %H:%M:%S                                              "12:49:11"
     %u     weekday as a decimal number ["1", "7"], with "1" representing Monday         "1" to "7"
     %U     week number of the current year as a decimal number, starting with the       "0" to ("52" or "53")
            first Sunday as the first day of the first week
     %V     The ISO 8601:1988 week number of the current year as a decimal number,       "00" to ("52" or "53")
            range 01 to 53, where week 1 is the first week that has at least 4 days 
            in the current year, and with Monday as the first day of the week. 
            (Use %G or %g for the year component that corresponds to the week number 
            for the specified timestamp.)
     %W     week number of the current year as a decimal number, starting with the       "00" to ("52" or "53")
            first Monday as the first day of the first week
     %w     day of the week as a decimal, Sunday being "0"                               "0" to "6"
     %x     preferred date representation for the current locale without the time        "4/13/2008"
     %X     preferred time representation for the current locale without the date        "12:53:05"
     %y     year as a decimal number without a century                                   "00" "99"
     %Y     year as a decimal number including the century                               "2008"
     %Z     time zone or name or abbreviation                                            "UTC", "EST", "PST"
     %z     same as %Z 
     %%     a literal "%" character                                                      "%"
      
     d      Day of the month, 2 digits with leading zeros                                "01" to "31"
     D      A textual representation of a day, three letters                             "Mon" through "Sun"
     j      Day of the month without leading zeros                                       "1" to "31"
     l      A full textual representation of the day of the week (lowercase "L")         "Sunday" through "Saturday"
     N      ISO-8601 numeric representation of the day of the week (added in PHP 5.1.0)  "1" (for Monday) through "7" (for Sunday)
     S      English ordinal suffix for the day of the month, 2 characters                "st", "nd", "rd" or "th". Works well with j
     w      Numeric representation of the day of the week                                "0" (for Sunday) through "6" (for Saturday)
     z      The day of the year (starting from "0")                                      "0" through "365"      
     W      ISO-8601 week number of year, weeks starting on Monday                       "00" to ("52" or "53")
     F      A full textual representation of a month, such as January or March           "January" through "December"
     m      Numeric representation of a month, with leading zeros                        "01" through "12"
     M      A short textual representation of a month, three letters                     "Jan" through "Dec"
     n      Numeric representation of a month, without leading zeros                     "1" through "12"
     t      Number of days in the given month                                            "28" through "31"
     L      Whether it's a leap year                                                     "1" if it is a leap year, "0" otherwise
     o      ISO-8601 year number. This has the same value as Y, except that if the       "2008"
            ISO week number (W) belongs to the previous or next year, that year 
            is used instead.
     Y      A full numeric representation of a year, 4 digits                            "2008"
     y      A two digit representation of a year                                         "08"
     a      Lowercase Ante meridiem and Post meridiem                                    "am" or "pm"
     A      Uppercase Ante meridiem and Post meridiem                                    "AM" or "PM"
     B      Swatch Internet time                                                         "000" through "999"
     g      12-hour format of an hour without leading zeros                              "1" through "12"
     G      24-hour format of an hour without leading zeros                              "0" through "23"
     h      12-hour format of an hour with leading zeros                                 "01" through "12"
     H      24-hour format of an hour with leading zeros                                 "00" through "23"
     i      Minutes with leading zeros                                                   "00" to "59"
     s      Seconds, with leading zeros                                                  "00" through "59"
     u      Milliseconds                                                                 "54321"
     e      Timezone identifier                                                          "UTC", "EST", "PST"
     I      Whether or not the date is in daylight saving time (uppercase i)             "1" if Daylight Saving Time, "0" otherwise
     O      Difference to Greenwich time (GMT) in hours                                  "+0200", "-0600"
     P      Difference to Greenwich time (GMT) with colon between hours and minutes      "+02:00", "-06:00"
     T      Timezone abbreviation                                                        "UTC", "EST", "PST"
     Z      Timezone offset in seconds. The offset for timezones west of UTC is          "-43200" through "50400"
            always negative, and for those east of UTC is always positive.
     c      ISO 8601 date                                                                "2004-02-12T15:19:21+00:00"
     r      RFC 2822 formatted date                                                      "Thu, 21 Dec 2000 16:01:07 +0200"
     U      Seconds since the Unix Epoch (January 1 1970 00:00:00 GMT)                   "0"     
     </pre>
     * @param {String}   A format string consisting of one or more format spcifiers [Optional].
     * @return {String}  A string representation of the current Date object.
     */
    $P.$format = function (format) { 
        var x = this, 
            y,
            t = function (v) {
                $f.push(v);
                return x.toString(v);
            };

        return format ? format.replace(/(%|\\)?.|%%/g, 
        function (m) {
            if (m.charAt(0) === "\\" || m.substring(0, 2) === "%%") {
                return m.replace("\\", "").replace("%%", "%");
            }
            switch (m) {
            case "d":
            case "%d":
                return t("dd");
            case "D":
            case "%a":
                return t("ddd");
            case "j":
            case "%e":
                return x.getDate();
            case "l":
            case "%A":
                return t("dddd");
            case "N":
            case "%u":
                return x.getDay() + 1;
            case "S":
                return t("S");
            case "w":
            case "%w":
                return x.getDay();
            case "z":
                return x.getOrdinalNumber();
            case "%j":
                return p(x.getOrdinalNumber(), 3);
            case "%U":
                var d1 = x.clone().set({month: 0, day: 1}).addDays(-1).moveToDayOfWeek(0),
                    d2 = x.clone().addDays(1).moveToDayOfWeek(0, -1);
                return (d2 < d1) ? "00" : p((d2.getOrdinalNumber() - d1.getOrdinalNumber()) / 7 + 1);                
            case "W":
            case "%V":
                return x.getISOWeek();
            case "%W":
                return p(x.getWeek());
            case "F":
            case "%B":
                return t("MMMM");
            case "m":
            case "%m":
                return t("MM");
            case "M":
            case "%b":
            case "%h":
                return t("MMM");
            case "n":
                return t("M");
            case "t":
                return $D.getDaysInMonth(x.getFullYear(), x.getMonth());
            case "L":
                return ($D.isLeapYear(x.getFullYear())) ? 1 : 0;
            case "o":
            case "%G":
                return x.setWeek(x.getISOWeek()).toString("yyyy");
            case "%g":
                return x.$format("%G").slice(-2);
            case "Y":
            case "%Y":
                return t("yyyy");
            case "y":
            case "%y":
                return t("yy");
            case "a":
            case "%p":
                return t("tt").toLowerCase();
            case "A":
                return t("tt").toUpperCase();
            case "g":
            case "%I":
                return t("h");
            case "G":
                return t("H");
            case "h":
                return t("hh");
            case "H":
            case "%H":
                return t("HH");
            case "i":
            case "%M":
                return t("mm");
            case "s":
            case "%S":
                return t("ss");
            case "u":
                return p(x.getMilliseconds(), 3);
            case "I":
                return (x.isDaylightSavingTime()) ? 1 : 0;
            case "O":
                return x.getUTCOffset();
            case "P":
                y = x.getUTCOffset();
                return y.substring(0, y.length - 2) + ":" + y.substring(y.length - 2);
            case "e":
            case "T":
            case "%z":
            case "%Z":            
                return x.getTimezone();
            case "Z":
                return x.getTimezoneOffset() * -60;
            case "B":
                var now = new Date();
                return Math.floor(((now.getHours() * 3600) + (now.getMinutes() * 60) + now.getSeconds() + (now.getTimezoneOffset() + 60) * 60) / 86.4);
            case "c":
                return x.toISOString().replace(/\"/g, "");
            case "U":
                return $D.strtotime("now");
            case "%c":
                return t("d") + " " + t("t");
            case "%C":
                return Math.floor(x.getFullYear() / 100 + 1);
            case "%D":
                return t("MM/dd/yy");
            case "%n":
                return "\\n";
            case "%t":
                return "\\t";
            case "%r":
                return t("hh:mm tt");                
            case "%R":
                return t("H:mm");
            case "%T":
                return t("H:mm:ss");
            case "%x":
                return t("d");
            case "%X":
                return t("t");
            default:
                $f.push(m);
			    return m;
            }
        }
        ) : this._toString();
    };
    
    if (!$P.format) {
        $P.format = $P.$format;
    }
}());
(function (window) {

  var StateMachine = {

    //---------------------------------------------------------------------------

    VERSION: "2.2.0",

    //---------------------------------------------------------------------------

    Result: {
      SUCCEEDED:    1, // the event transitioned successfully from one state to another
      NOTRANSITION: 2, // the event was successfull but no state transition was necessary
      CANCELLED:    3, // the event was cancelled by the caller in a beforeEvent callback
      ASYNC:        4 // the event is asynchronous and the caller is in control of when the transition occurs
    },

    Error: {
      INVALID_TRANSITION: 100, // caller tried to fire an event that was innapropriate in the current state
      PENDING_TRANSITION: 200, // caller tried to fire an event while an async transition was still pending
      INVALID_CALLBACK:   300 // caller provided callback function threw an exception
    },

    WILDCARD: '*',
    ASYNC: 'async',

    //---------------------------------------------------------------------------

    create: function(cfg, target) {

      var initial   = (typeof cfg.initial == 'string') ? { state: cfg.initial } : cfg.initial; // allow for a simple string, or an object with { state: 'foo', event: 'setup', defer: true|false }
      var fsm       = target || cfg.target  || {};
      var events    = cfg.events || [];
      var callbacks = cfg.callbacks || {};
      var map       = {};

      var add = function(e) {
        var from = (e.from instanceof Array) ? e.from : (e.from ? [e.from] : [StateMachine.WILDCARD]); // allow 'wildcard' transition if 'from' is not specified
        map[e.name] = map[e.name] || {};
        for (var n = 0 ; n < from.length ; n++)
          map[e.name][from[n]] = e.to || from[n]; // allow no-op transition if 'to' is not specified
      };

      if (initial) {
        initial.event = initial.event || 'startup';
        add({ name: initial.event, from: 'none', to: initial.state });
      }

      for(var n = 0 ; n < events.length ; n++)
        add(events[n]);

      for(var name in map) {
        if (map.hasOwnProperty(name))
          fsm[name] = StateMachine.buildEvent(name, map[name]);
      }

      for(var name in callbacks) {
        if (callbacks.hasOwnProperty(name))
          fsm[name] = callbacks[name]
      }

      fsm.current = 'none';
      fsm.is      = function(state) { return this.current == state; };
      fsm.can     = function(event) { return !this.transition && (map[event].hasOwnProperty(this.current) || map[event].hasOwnProperty(StateMachine.WILDCARD)); }
      fsm.cannot  = function(event) { return !this.can(event); };
      fsm.error   = cfg.error || function(name, from, to, args, error, msg, e) { throw e || msg; }; // default behavior when something unexpected happens is to throw an exception, but caller can override this behavior if desired (see github issue #3 and #17)

      if (initial && !initial.defer)
        fsm[initial.event]();

      return fsm;

    },

    //===========================================================================

    doCallback: function(fsm, func, name, from, to, args) {
      if (func) {
        try {
          return func.apply(fsm, [name, from, to].concat(args));
        }
        catch(e) {
          return fsm.error(name, from, to, args, StateMachine.Error.INVALID_CALLBACK, "an exception occurred in a caller-provided callback function", e);
        }
      }
    },

    beforeEvent: function(fsm, name, from, to, args) { return StateMachine.doCallback(fsm, fsm['onbefore' + name],                     name, from, to, args); },
    afterEvent:  function(fsm, name, from, to, args) { return StateMachine.doCallback(fsm, fsm['onafter'  + name] || fsm['on' + name], name, from, to, args); },
    leaveState:  function(fsm, name, from, to, args) { return StateMachine.doCallback(fsm, fsm['onleave'  + from],                     name, from, to, args); },
    enterState:  function(fsm, name, from, to, args) { return StateMachine.doCallback(fsm, fsm['onenter'  + to]   || fsm['on' + to],   name, from, to, args); },
    changeState: function(fsm, name, from, to, args) { return StateMachine.doCallback(fsm, fsm['onchangestate'],                       name, from, to, args); },


    buildEvent: function(name, map) {
      return function() {

        var from  = this.current;
        var to    = map[from] || map[StateMachine.WILDCARD] || from;
        var args  = Array.prototype.slice.call(arguments); // turn arguments into pure array

        if (this.transition)
          return this.error(name, from, to, args, StateMachine.Error.PENDING_TRANSITION, "event " + name + " inappropriate because previous transition did not complete");

        if (this.cannot(name))
          return this.error(name, from, to, args, StateMachine.Error.INVALID_TRANSITION, "event " + name + " inappropriate in current state " + this.current);

        if (false === StateMachine.beforeEvent(this, name, from, to, args))
          return StateMachine.CANCELLED;

        if (from === to) {
          StateMachine.afterEvent(this, name, from, to, args);
          return StateMachine.NOTRANSITION;
        }

        // prepare a transition method for use EITHER lower down, or by caller if they want an async transition (indicated by an ASYNC return value from leaveState)
        var fsm = this;
        this.transition = function() {
          fsm.transition = null; // this method should only ever be called once
          fsm.current = to;
          StateMachine.enterState( fsm, name, from, to, args);
          StateMachine.changeState(fsm, name, from, to, args);
          StateMachine.afterEvent( fsm, name, from, to, args);
        };
        this.transition.cancel = function() { // provide a way for caller to cancel async transition if desired (issue #22)
          fsm.transition = null;
          StateMachine.afterEvent(fsm, name, from, to, args);
        }

        var leave = StateMachine.leaveState(this, name, from, to, args);
        if (false === leave) {
          this.transition = null;
          return StateMachine.CANCELLED;
        }
        else if ("async" === leave) {
          return StateMachine.ASYNC;
        }
        else {
          if (this.transition)
            this.transition(); // in case user manually called transition() but forgot to return ASYNC
          return StateMachine.SUCCEEDED;
        }

      };
    }

  }; // StateMachine

  //===========================================================================

  if ("function" === typeof define) {
    define(function(require) { return StateMachine; });
  }
  else {
    window.StateMachine = StateMachine;
  }

}(this));


// Knockout JavaScript library v2.2.0
// (c) Steven Sanderson - http://knockoutjs.com/
// License: MIT (http://www.opensource.org/licenses/mit-license.php)

(function(){
var DEBUG=true;
(function(window,document,navigator,jQuery,undefined){
!function(factory) {
    // Support three module loading scenarios
    if (typeof require === 'function' && typeof exports === 'object' && typeof module === 'object') {
        // [1] CommonJS/Node.js
        var target = module['exports'] || exports; // module.exports is for Node.js
        factory(target);
    } else if (typeof define === 'function' && define['amd']) {
        // [2] AMD anonymous module
        define(['exports'], factory);
    } else {
        // [3] No module loader (plain <script> tag) - put directly in global namespace
        factory(window['ko'] = {});
    }
}(function(koExports){
// Internally, all KO objects are attached to koExports (even the non-exported ones whose names will be minified by the closure compiler).
// In the future, the following "ko" variable may be made distinct from "koExports" so that private objects are not externally reachable.
var ko = typeof koExports !== 'undefined' ? koExports : {};
// Google Closure Compiler helpers (used only to make the minified file smaller)
ko.exportSymbol = function(koPath, object) {
	var tokens = koPath.split(".");

	// In the future, "ko" may become distinct from "koExports" (so that non-exported objects are not reachable)
	// At that point, "target" would be set to: (typeof koExports !== "undefined" ? koExports : ko)
	var target = ko;

	for (var i = 0; i < tokens.length - 1; i++)
		target = target[tokens[i]];
	target[tokens[tokens.length - 1]] = object;
};
ko.exportProperty = function(owner, publicName, object) {
  owner[publicName] = object;
};
ko.version = "2.2.0";

ko.exportSymbol('version', ko.version);
ko.utils = new (function () {
    var stringTrimRegex = /^(\s|\u00A0)+|(\s|\u00A0)+$/g;

    // Represent the known event types in a compact way, then at runtime transform it into a hash with event name as key (for fast lookup)
    var knownEvents = {}, knownEventTypesByEventName = {};
    var keyEventTypeName = /Firefox\/2/i.test(navigator.userAgent) ? 'KeyboardEvent' : 'UIEvents';
    knownEvents[keyEventTypeName] = ['keyup', 'keydown', 'keypress'];
    knownEvents['MouseEvents'] = ['click', 'dblclick', 'mousedown', 'mouseup', 'mousemove', 'mouseover', 'mouseout', 'mouseenter', 'mouseleave'];
    for (var eventType in knownEvents) {
        var knownEventsForType = knownEvents[eventType];
        if (knownEventsForType.length) {
            for (var i = 0, j = knownEventsForType.length; i < j; i++)
                knownEventTypesByEventName[knownEventsForType[i]] = eventType;
        }
    }
    var eventsThatMustBeRegisteredUsingAttachEvent = { 'propertychange': true }; // Workaround for an IE9 issue - https://github.com/SteveSanderson/knockout/issues/406

    // Detect IE versions for bug workarounds (uses IE conditionals, not UA string, for robustness)
    // Note that, since IE 10 does not support conditional comments, the following logic only detects IE < 10.
    // Currently this is by design, since IE 10+ behaves correctly when treated as a standard browser.
    // If there is a future need to detect specific versions of IE10+, we will amend this.
    var ieVersion = (function() {
        var version = 3, div = document.createElement('div'), iElems = div.getElementsByTagName('i');

        // Keep constructing conditional HTML blocks until we hit one that resolves to an empty fragment
        while (
            div.innerHTML = '<!--[if gt IE ' + (++version) + ']><i></i><![endif]-->',
            iElems[0]
        );
        return version > 4 ? version : undefined;
    }());
    var isIe6 = ieVersion === 6,
        isIe7 = ieVersion === 7;

    function isClickOnCheckableElement(element, eventType) {
        if ((ko.utils.tagNameLower(element) !== "input") || !element.type) return false;
        if (eventType.toLowerCase() != "click") return false;
        var inputType = element.type;
        return (inputType == "checkbox") || (inputType == "radio");
    }

    return {
        fieldsIncludedWithJsonPost: ['authenticity_token', /^__RequestVerificationToken(_.*)?$/],

        arrayForEach: function (array, action) {
            for (var i = 0, j = array.length; i < j; i++)
                action(array[i]);
        },

        arrayIndexOf: function (array, item) {
            if (typeof Array.prototype.indexOf == "function")
                return Array.prototype.indexOf.call(array, item);
            for (var i = 0, j = array.length; i < j; i++)
                if (array[i] === item)
                    return i;
            return -1;
        },

        arrayFirst: function (array, predicate, predicateOwner) {
            for (var i = 0, j = array.length; i < j; i++)
                if (predicate.call(predicateOwner, array[i]))
                    return array[i];
            return null;
        },

        arrayRemoveItem: function (array, itemToRemove) {
            var index = ko.utils.arrayIndexOf(array, itemToRemove);
            if (index >= 0)
                array.splice(index, 1);
        },

        arrayGetDistinctValues: function (array) {
            array = array || [];
            var result = [];
            for (var i = 0, j = array.length; i < j; i++) {
                if (ko.utils.arrayIndexOf(result, array[i]) < 0)
                    result.push(array[i]);
            }
            return result;
        },

        arrayMap: function (array, mapping) {
            array = array || [];
            var result = [];
            for (var i = 0, j = array.length; i < j; i++)
                result.push(mapping(array[i]));
            return result;
        },

        arrayFilter: function (array, predicate) {
            array = array || [];
            var result = [];
            for (var i = 0, j = array.length; i < j; i++)
                if (predicate(array[i]))
                    result.push(array[i]);
            return result;
        },

        arrayPushAll: function (array, valuesToPush) {
            if (valuesToPush instanceof Array)
                array.push.apply(array, valuesToPush);
            else
                for (var i = 0, j = valuesToPush.length; i < j; i++)
                    array.push(valuesToPush[i]);
            return array;
        },

        extend: function (target, source) {
            if (source) {
                for(var prop in source) {
                    if(source.hasOwnProperty(prop)) {
                        target[prop] = source[prop];
                    }
                }
            }
            return target;
        },

        emptyDomNode: function (domNode) {
            while (domNode.firstChild) {
                ko.removeNode(domNode.firstChild);
            }
        },

        moveCleanedNodesToContainerElement: function(nodes) {
            // Ensure it's a real array, as we're about to reparent the nodes and
            // we don't want the underlying collection to change while we're doing that.
            var nodesArray = ko.utils.makeArray(nodes);

            var container = document.createElement('div');
            for (var i = 0, j = nodesArray.length; i < j; i++) {
                container.appendChild(ko.cleanNode(nodesArray[i]));
            }
            return container;
        },

        cloneNodes: function (nodesArray, shouldCleanNodes) {
            for (var i = 0, j = nodesArray.length, newNodesArray = []; i < j; i++) {
                var clonedNode = nodesArray[i].cloneNode(true);
                newNodesArray.push(shouldCleanNodes ? ko.cleanNode(clonedNode) : clonedNode);
            }
            return newNodesArray;
        },

        setDomNodeChildren: function (domNode, childNodes) {
            ko.utils.emptyDomNode(domNode);
            if (childNodes) {
                for (var i = 0, j = childNodes.length; i < j; i++)
                    domNode.appendChild(childNodes[i]);
            }
        },

        replaceDomNodes: function (nodeToReplaceOrNodeArray, newNodesArray) {
            var nodesToReplaceArray = nodeToReplaceOrNodeArray.nodeType ? [nodeToReplaceOrNodeArray] : nodeToReplaceOrNodeArray;
            if (nodesToReplaceArray.length > 0) {
                var insertionPoint = nodesToReplaceArray[0];
                var parent = insertionPoint.parentNode;
                for (var i = 0, j = newNodesArray.length; i < j; i++)
                    parent.insertBefore(newNodesArray[i], insertionPoint);
                for (var i = 0, j = nodesToReplaceArray.length; i < j; i++) {
                    ko.removeNode(nodesToReplaceArray[i]);
                }
            }
        },

        setOptionNodeSelectionState: function (optionNode, isSelected) {
            // IE6 sometimes throws "unknown error" if you try to write to .selected directly, whereas Firefox struggles with setAttribute. Pick one based on browser.
            if (ieVersion < 7)
                optionNode.setAttribute("selected", isSelected);
            else
                optionNode.selected = isSelected;
        },

        stringTrim: function (string) {
            return (string || "").replace(stringTrimRegex, "");
        },

        stringTokenize: function (string, delimiter) {
            var result = [];
            var tokens = (string || "").split(delimiter);
            for (var i = 0, j = tokens.length; i < j; i++) {
                var trimmed = ko.utils.stringTrim(tokens[i]);
                if (trimmed !== "")
                    result.push(trimmed);
            }
            return result;
        },

        stringStartsWith: function (string, startsWith) {
            string = string || "";
            if (startsWith.length > string.length)
                return false;
            return string.substring(0, startsWith.length) === startsWith;
        },

        domNodeIsContainedBy: function (node, containedByNode) {
            if (containedByNode.compareDocumentPosition)
                return (containedByNode.compareDocumentPosition(node) & 16) == 16;
            while (node != null) {
                if (node == containedByNode)
                    return true;
                node = node.parentNode;
            }
            return false;
        },

        domNodeIsAttachedToDocument: function (node) {
            return ko.utils.domNodeIsContainedBy(node, node.ownerDocument);
        },

        tagNameLower: function(element) {
            // For HTML elements, tagName will always be upper case; for XHTML elements, it'll be lower case.
            // Possible future optimization: If we know it's an element from an XHTML document (not HTML),
            // we don't need to do the .toLowerCase() as it will always be lower case anyway.
            return element && element.tagName && element.tagName.toLowerCase();
        },

        registerEventHandler: function (element, eventType, handler) {
            var mustUseAttachEvent = ieVersion && eventsThatMustBeRegisteredUsingAttachEvent[eventType];
            if (!mustUseAttachEvent && typeof jQuery != "undefined") {
                if (isClickOnCheckableElement(element, eventType)) {
                    // For click events on checkboxes, jQuery interferes with the event handling in an awkward way:
                    // it toggles the element checked state *after* the click event handlers run, whereas native
                    // click events toggle the checked state *before* the event handler.
                    // Fix this by intecepting the handler and applying the correct checkedness before it runs.
                    var originalHandler = handler;
                    handler = function(event, eventData) {
                        var jQuerySuppliedCheckedState = this.checked;
                        if (eventData)
                            this.checked = eventData.checkedStateBeforeEvent !== true;
                        originalHandler.call(this, event);
                        this.checked = jQuerySuppliedCheckedState; // Restore the state jQuery applied
                    };
                }
                jQuery(element)['bind'](eventType, handler);
            } else if (!mustUseAttachEvent && typeof element.addEventListener == "function")
                element.addEventListener(eventType, handler, false);
            else if (typeof element.attachEvent != "undefined")
                element.attachEvent("on" + eventType, function (event) {
                    handler.call(element, event);
                });
            else
                throw new Error("Browser doesn't support addEventListener or attachEvent");
        },

        triggerEvent: function (element, eventType) {
            if (!(element && element.nodeType))
                throw new Error("element must be a DOM node when calling triggerEvent");

            if (typeof jQuery != "undefined") {
                var eventData = [];
                if (isClickOnCheckableElement(element, eventType)) {
                    // Work around the jQuery "click events on checkboxes" issue described above by storing the original checked state before triggering the handler
                    eventData.push({ checkedStateBeforeEvent: element.checked });
                }
                jQuery(element)['trigger'](eventType, eventData);
            } else if (typeof document.createEvent == "function") {
                if (typeof element.dispatchEvent == "function") {
                    var eventCategory = knownEventTypesByEventName[eventType] || "HTMLEvents";
                    var event = document.createEvent(eventCategory);
                    event.initEvent(eventType, true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, element);
                    element.dispatchEvent(event);
                }
                else
                    throw new Error("The supplied element doesn't support dispatchEvent");
            } else if (typeof element.fireEvent != "undefined") {
                // Unlike other browsers, IE doesn't change the checked state of checkboxes/radiobuttons when you trigger their "click" event
                // so to make it consistent, we'll do it manually here
                if (isClickOnCheckableElement(element, eventType))
                    element.checked = element.checked !== true;
                element.fireEvent("on" + eventType);
            }
            else
                throw new Error("Browser doesn't support triggering events");
        },

        unwrapObservable: function (value) {
            return ko.isObservable(value) ? value() : value;
        },

        peekObservable: function (value) {
            return ko.isObservable(value) ? value.peek() : value;
        },

        toggleDomNodeCssClass: function (node, classNames, shouldHaveClass) {
            if (classNames) {
                var cssClassNameRegex = /[\w-]+/g,
                    currentClassNames = node.className.match(cssClassNameRegex) || [];
                ko.utils.arrayForEach(classNames.match(cssClassNameRegex), function(className) {
                    var indexOfClass = ko.utils.arrayIndexOf(currentClassNames, className);
                    if (indexOfClass >= 0) {
                        if (!shouldHaveClass)
                            currentClassNames.splice(indexOfClass, 1);
                    } else {
                        if (shouldHaveClass)
                            currentClassNames.push(className);
                    }
                });
                node.className = currentClassNames.join(" ");
            }
        },

        setTextContent: function(element, textContent) {
            var value = ko.utils.unwrapObservable(textContent);
            if ((value === null) || (value === undefined))
                value = "";

            if (element.nodeType === 3) {
                element.data = value;
            } else {
                // We need there to be exactly one child: a text node.
                // If there are no children, more than one, or if it's not a text node,
                // we'll clear everything and create a single text node.
                var innerTextNode = ko.virtualElements.firstChild(element);
                if (!innerTextNode || innerTextNode.nodeType != 3 || ko.virtualElements.nextSibling(innerTextNode)) {
                    ko.virtualElements.setDomNodeChildren(element, [document.createTextNode(value)]);
                } else {
                    innerTextNode.data = value;
                }

                ko.utils.forceRefresh(element);
            }
        },

        setElementName: function(element, name) {
            element.name = name;

            // Workaround IE 6/7 issue
            // - https://github.com/SteveSanderson/knockout/issues/197
            // - http://www.matts411.com/post/setting_the_name_attribute_in_ie_dom/
            if (ieVersion <= 7) {
                try {
                    element.mergeAttributes(document.createElement("<input name='" + element.name + "'/>"), false);
                }
                catch(e) {} // For IE9 with doc mode "IE9 Standards" and browser mode "IE9 Compatibility View"
            }
        },

        forceRefresh: function(node) {
            // Workaround for an IE9 rendering bug - https://github.com/SteveSanderson/knockout/issues/209
            if (ieVersion >= 9) {
                // For text nodes and comment nodes (most likely virtual elements), we will have to refresh the container
                var elem = node.nodeType == 1 ? node : node.parentNode;
                if (elem.style)
                    elem.style.zoom = elem.style.zoom;
            }
        },

        ensureSelectElementIsRenderedCorrectly: function(selectElement) {
            // Workaround for IE9 rendering bug - it doesn't reliably display all the text in dynamically-added select boxes unless you force it to re-render by updating the width.
            // (See https://github.com/SteveSanderson/knockout/issues/312, http://stackoverflow.com/questions/5908494/select-only-shows-first-char-of-selected-option)
            if (ieVersion >= 9) {
                var originalWidth = selectElement.style.width;
                selectElement.style.width = 0;
                selectElement.style.width = originalWidth;
            }
        },

        range: function (min, max) {
            min = ko.utils.unwrapObservable(min);
            max = ko.utils.unwrapObservable(max);
            var result = [];
            for (var i = min; i <= max; i++)
                result.push(i);
            return result;
        },

        makeArray: function(arrayLikeObject) {
            var result = [];
            for (var i = 0, j = arrayLikeObject.length; i < j; i++) {
                result.push(arrayLikeObject[i]);
            };
            return result;
        },

        isIe6 : isIe6,
        isIe7 : isIe7,
        ieVersion : ieVersion,

        getFormFields: function(form, fieldName) {
            var fields = ko.utils.makeArray(form.getElementsByTagName("input")).concat(ko.utils.makeArray(form.getElementsByTagName("textarea")));
            var isMatchingField = (typeof fieldName == 'string')
                ? function(field) { return field.name === fieldName }
                : function(field) { return fieldName.test(field.name) }; // Treat fieldName as regex or object containing predicate
            var matches = [];
            for (var i = fields.length - 1; i >= 0; i--) {
                if (isMatchingField(fields[i]))
                    matches.push(fields[i]);
            };
            return matches;
        },

        parseJson: function (jsonString) {
            if (typeof jsonString == "string") {
                jsonString = ko.utils.stringTrim(jsonString);
                if (jsonString) {
                    if (window.JSON && window.JSON.parse) // Use native parsing where available
                        return window.JSON.parse(jsonString);
                    return (new Function("return " + jsonString))(); // Fallback on less safe parsing for older browsers
                }
            }
            return null;
        },

        stringifyJson: function (data, replacer, space) {   // replacer and space are optional
            if ((typeof JSON == "undefined") || (typeof JSON.stringify == "undefined"))
                throw new Error("Cannot find JSON.stringify(). Some browsers (e.g., IE < 8) don't support it natively, but you can overcome this by adding a script reference to json2.js, downloadable from http://www.json.org/json2.js");
            return JSON.stringify(ko.utils.unwrapObservable(data), replacer, space);
        },

        postJson: function (urlOrForm, data, options) {
            options = options || {};
            var params = options['params'] || {};
            var includeFields = options['includeFields'] || this.fieldsIncludedWithJsonPost;
            var url = urlOrForm;

            // If we were given a form, use its 'action' URL and pick out any requested field values
            if((typeof urlOrForm == 'object') && (ko.utils.tagNameLower(urlOrForm) === "form")) {
                var originalForm = urlOrForm;
                url = originalForm.action;
                for (var i = includeFields.length - 1; i >= 0; i--) {
                    var fields = ko.utils.getFormFields(originalForm, includeFields[i]);
                    for (var j = fields.length - 1; j >= 0; j--)
                        params[fields[j].name] = fields[j].value;
                }
            }

            data = ko.utils.unwrapObservable(data);
            var form = document.createElement("form");
            form.style.display = "none";
            form.action = url;
            form.method = "post";
            for (var key in data) {
                var input = document.createElement("input");
                input.name = key;
                input.value = ko.utils.stringifyJson(ko.utils.unwrapObservable(data[key]));
                form.appendChild(input);
            }
            for (var key in params) {
                var input = document.createElement("input");
                input.name = key;
                input.value = params[key];
                form.appendChild(input);
            }
            document.body.appendChild(form);
            options['submitter'] ? options['submitter'](form) : form.submit();
            setTimeout(function () { form.parentNode.removeChild(form); }, 0);
        }
    }
})();

ko.exportSymbol('utils', ko.utils);
ko.exportSymbol('utils.arrayForEach', ko.utils.arrayForEach);
ko.exportSymbol('utils.arrayFirst', ko.utils.arrayFirst);
ko.exportSymbol('utils.arrayFilter', ko.utils.arrayFilter);
ko.exportSymbol('utils.arrayGetDistinctValues', ko.utils.arrayGetDistinctValues);
ko.exportSymbol('utils.arrayIndexOf', ko.utils.arrayIndexOf);
ko.exportSymbol('utils.arrayMap', ko.utils.arrayMap);
ko.exportSymbol('utils.arrayPushAll', ko.utils.arrayPushAll);
ko.exportSymbol('utils.arrayRemoveItem', ko.utils.arrayRemoveItem);
ko.exportSymbol('utils.extend', ko.utils.extend);
ko.exportSymbol('utils.fieldsIncludedWithJsonPost', ko.utils.fieldsIncludedWithJsonPost);
ko.exportSymbol('utils.getFormFields', ko.utils.getFormFields);
ko.exportSymbol('utils.peekObservable', ko.utils.peekObservable);
ko.exportSymbol('utils.postJson', ko.utils.postJson);
ko.exportSymbol('utils.parseJson', ko.utils.parseJson);
ko.exportSymbol('utils.registerEventHandler', ko.utils.registerEventHandler);
ko.exportSymbol('utils.stringifyJson', ko.utils.stringifyJson);
ko.exportSymbol('utils.range', ko.utils.range);
ko.exportSymbol('utils.toggleDomNodeCssClass', ko.utils.toggleDomNodeCssClass);
ko.exportSymbol('utils.triggerEvent', ko.utils.triggerEvent);
ko.exportSymbol('utils.unwrapObservable', ko.utils.unwrapObservable);

if (!Function.prototype['bind']) {
    // Function.prototype.bind is a standard part of ECMAScript 5th Edition (December 2009, http://www.ecma-international.org/publications/files/ECMA-ST/ECMA-262.pdf)
    // In case the browser doesn't implement it natively, provide a JavaScript implementation. This implementation is based on the one in prototype.js
    Function.prototype['bind'] = function (object) {
        var originalFunction = this, args = Array.prototype.slice.call(arguments), object = args.shift();
        return function () {
            return originalFunction.apply(object, args.concat(Array.prototype.slice.call(arguments)));
        };
    };
}

ko.utils.domData = new (function () {
    var uniqueId = 0;
    var dataStoreKeyExpandoPropertyName = "__ko__" + (new Date).getTime();
    var dataStore = {};
    return {
        get: function (node, key) {
            var allDataForNode = ko.utils.domData.getAll(node, false);
            return allDataForNode === undefined ? undefined : allDataForNode[key];
        },
        set: function (node, key, value) {
            if (value === undefined) {
                // Make sure we don't actually create a new domData key if we are actually deleting a value
                if (ko.utils.domData.getAll(node, false) === undefined)
                    return;
            }
            var allDataForNode = ko.utils.domData.getAll(node, true);
            allDataForNode[key] = value;
        },
        getAll: function (node, createIfNotFound) {
            var dataStoreKey = node[dataStoreKeyExpandoPropertyName];
            var hasExistingDataStore = dataStoreKey && (dataStoreKey !== "null") && dataStore[dataStoreKey];
            if (!hasExistingDataStore) {
                if (!createIfNotFound)
                    return undefined;
                dataStoreKey = node[dataStoreKeyExpandoPropertyName] = "ko" + uniqueId++;
                dataStore[dataStoreKey] = {};
            }
            return dataStore[dataStoreKey];
        },
        clear: function (node) {
            var dataStoreKey = node[dataStoreKeyExpandoPropertyName];
            if (dataStoreKey) {
                delete dataStore[dataStoreKey];
                node[dataStoreKeyExpandoPropertyName] = null;
                return true; // Exposing "did clean" flag purely so specs can infer whether things have been cleaned up as intended
            }
            return false;
        }
    }
})();

ko.exportSymbol('utils.domData', ko.utils.domData);
ko.exportSymbol('utils.domData.clear', ko.utils.domData.clear); // Exporting only so specs can clear up after themselves fully

ko.utils.domNodeDisposal = new (function () {
    var domDataKey = "__ko_domNodeDisposal__" + (new Date).getTime();
    var cleanableNodeTypes = { 1: true, 8: true, 9: true };       // Element, Comment, Document
    var cleanableNodeTypesWithDescendants = { 1: true, 9: true }; // Element, Document

    function getDisposeCallbacksCollection(node, createIfNotFound) {
        var allDisposeCallbacks = ko.utils.domData.get(node, domDataKey);
        if ((allDisposeCallbacks === undefined) && createIfNotFound) {
            allDisposeCallbacks = [];
            ko.utils.domData.set(node, domDataKey, allDisposeCallbacks);
        }
        return allDisposeCallbacks;
    }
    function destroyCallbacksCollection(node) {
        ko.utils.domData.set(node, domDataKey, undefined);
    }

    function cleanSingleNode(node) {
        // Run all the dispose callbacks
        var callbacks = getDisposeCallbacksCollection(node, false);
        if (callbacks) {
            callbacks = callbacks.slice(0); // Clone, as the array may be modified during iteration (typically, callbacks will remove themselves)
            for (var i = 0; i < callbacks.length; i++)
                callbacks[i](node);
        }

        // Also erase the DOM data
        ko.utils.domData.clear(node);

        // Special support for jQuery here because it's so commonly used.
        // Many jQuery plugins (including jquery.tmpl) store data using jQuery's equivalent of domData
        // so notify it to tear down any resources associated with the node & descendants here.
        if ((typeof jQuery == "function") && (typeof jQuery['cleanData'] == "function"))
            jQuery['cleanData']([node]);

        // Also clear any immediate-child comment nodes, as these wouldn't have been found by
        // node.getElementsByTagName("*") in cleanNode() (comment nodes aren't elements)
        if (cleanableNodeTypesWithDescendants[node.nodeType])
            cleanImmediateCommentTypeChildren(node);
    }

    function cleanImmediateCommentTypeChildren(nodeWithChildren) {
        var child, nextChild = nodeWithChildren.firstChild;
        while (child = nextChild) {
            nextChild = child.nextSibling;
            if (child.nodeType === 8)
                cleanSingleNode(child);
        }
    }

    return {
        addDisposeCallback : function(node, callback) {
            if (typeof callback != "function")
                throw new Error("Callback must be a function");
            getDisposeCallbacksCollection(node, true).push(callback);
        },

        removeDisposeCallback : function(node, callback) {
            var callbacksCollection = getDisposeCallbacksCollection(node, false);
            if (callbacksCollection) {
                ko.utils.arrayRemoveItem(callbacksCollection, callback);
                if (callbacksCollection.length == 0)
                    destroyCallbacksCollection(node);
            }
        },

        cleanNode : function(node) {
            // First clean this node, where applicable
            if (cleanableNodeTypes[node.nodeType]) {
                cleanSingleNode(node);

                // ... then its descendants, where applicable
                if (cleanableNodeTypesWithDescendants[node.nodeType]) {
                    // Clone the descendants list in case it changes during iteration
                    var descendants = [];
                    ko.utils.arrayPushAll(descendants, node.getElementsByTagName("*"));
                    for (var i = 0, j = descendants.length; i < j; i++)
                        cleanSingleNode(descendants[i]);
                }
            }
            return node;
        },

        removeNode : function(node) {
            ko.cleanNode(node);
            if (node.parentNode)
                node.parentNode.removeChild(node);
        }
    }
})();
ko.cleanNode = ko.utils.domNodeDisposal.cleanNode; // Shorthand name for convenience
ko.removeNode = ko.utils.domNodeDisposal.removeNode; // Shorthand name for convenience
ko.exportSymbol('cleanNode', ko.cleanNode);
ko.exportSymbol('removeNode', ko.removeNode);
ko.exportSymbol('utils.domNodeDisposal', ko.utils.domNodeDisposal);
ko.exportSymbol('utils.domNodeDisposal.addDisposeCallback', ko.utils.domNodeDisposal.addDisposeCallback);
ko.exportSymbol('utils.domNodeDisposal.removeDisposeCallback', ko.utils.domNodeDisposal.removeDisposeCallback);
(function () {
    var leadingCommentRegex = /^(\s*)<!--(.*?)-->/;

    function simpleHtmlParse(html) {
        // Based on jQuery's "clean" function, but only accounting for table-related elements.
        // If you have referenced jQuery, this won't be used anyway - KO will use jQuery's "clean" function directly

        // Note that there's still an issue in IE < 9 whereby it will discard comment nodes that are the first child of
        // a descendant node. For example: "<div><!-- mycomment -->abc</div>" will get parsed as "<div>abc</div>"
        // This won't affect anyone who has referenced jQuery, and there's always the workaround of inserting a dummy node
        // (possibly a text node) in front of the comment. So, KO does not attempt to workaround this IE issue automatically at present.

        // Trim whitespace, otherwise indexOf won't work as expected
        var tags = ko.utils.stringTrim(html).toLowerCase(), div = document.createElement("div");

        // Finds the first match from the left column, and returns the corresponding "wrap" data from the right column
        var wrap = tags.match(/^<(thead|tbody|tfoot)/)              && [1, "<table>", "</table>"] ||
                   !tags.indexOf("<tr")                             && [2, "<table><tbody>", "</tbody></table>"] ||
                   (!tags.indexOf("<td") || !tags.indexOf("<th"))   && [3, "<table><tbody><tr>", "</tr></tbody></table>"] ||
                   /* anything else */                                 [0, "", ""];

        // Go to html and back, then peel off extra wrappers
        // Note that we always prefix with some dummy text, because otherwise, IE<9 will strip out leading comment nodes in descendants. Total madness.
        var markup = "ignored<div>" + wrap[1] + html + wrap[2] + "</div>";
        if (typeof window['innerShiv'] == "function") {
            div.appendChild(window['innerShiv'](markup));
        } else {
            div.innerHTML = markup;
        }

        // Move to the right depth
        while (wrap[0]--)
            div = div.lastChild;

        return ko.utils.makeArray(div.lastChild.childNodes);
    }

    function jQueryHtmlParse(html) {
        var elems = jQuery['clean']([html]);

        // As of jQuery 1.7.1, jQuery parses the HTML by appending it to some dummy parent nodes held in an in-memory document fragment.
        // Unfortunately, it never clears the dummy parent nodes from the document fragment, so it leaks memory over time.
        // Fix this by finding the top-most dummy parent element, and detaching it from its owner fragment.
        if (elems && elems[0]) {
            // Find the top-most parent element that's a direct child of a document fragment
            var elem = elems[0];
            while (elem.parentNode && elem.parentNode.nodeType !== 11 /* i.e., DocumentFragment */)
                elem = elem.parentNode;
            // ... then detach it
            if (elem.parentNode)
                elem.parentNode.removeChild(elem);
        }

        return elems;
    }

    ko.utils.parseHtmlFragment = function(html) {
        return typeof jQuery != 'undefined' ? jQueryHtmlParse(html)   // As below, benefit from jQuery's optimisations where possible
                                            : simpleHtmlParse(html);  // ... otherwise, this simple logic will do in most common cases.
    };

    ko.utils.setHtml = function(node, html) {
        ko.utils.emptyDomNode(node);

        // There's no legitimate reason to display a stringified observable without unwrapping it, so we'll unwrap it
        html = ko.utils.unwrapObservable(html);

        if ((html !== null) && (html !== undefined)) {
            if (typeof html != 'string')
                html = html.toString();

            // jQuery contains a lot of sophisticated code to parse arbitrary HTML fragments,
            // for example <tr> elements which are not normally allowed to exist on their own.
            // If you've referenced jQuery we'll use that rather than duplicating its code.
            if (typeof jQuery != 'undefined') {
                jQuery(node)['html'](html);
            } else {
                // ... otherwise, use KO's own parsing logic.
                var parsedNodes = ko.utils.parseHtmlFragment(html);
                for (var i = 0; i < parsedNodes.length; i++)
                    node.appendChild(parsedNodes[i]);
            }
        }
    };
})();

ko.exportSymbol('utils.parseHtmlFragment', ko.utils.parseHtmlFragment);
ko.exportSymbol('utils.setHtml', ko.utils.setHtml);

ko.memoization = (function () {
    var memos = {};

    function randomMax8HexChars() {
        return (((1 + Math.random()) * 0x100000000) | 0).toString(16).substring(1);
    }
    function generateRandomId() {
        return randomMax8HexChars() + randomMax8HexChars();
    }
    function findMemoNodes(rootNode, appendToArray) {
        if (!rootNode)
            return;
        if (rootNode.nodeType == 8) {
            var memoId = ko.memoization.parseMemoText(rootNode.nodeValue);
            if (memoId != null)
                appendToArray.push({ domNode: rootNode, memoId: memoId });
        } else if (rootNode.nodeType == 1) {
            for (var i = 0, childNodes = rootNode.childNodes, j = childNodes.length; i < j; i++)
                findMemoNodes(childNodes[i], appendToArray);
        }
    }

    return {
        memoize: function (callback) {
            if (typeof callback != "function")
                throw new Error("You can only pass a function to ko.memoization.memoize()");
            var memoId = generateRandomId();
            memos[memoId] = callback;
            return "<!--[ko_memo:" + memoId + "]-->";
        },

        unmemoize: function (memoId, callbackParams) {
            var callback = memos[memoId];
            if (callback === undefined)
                throw new Error("Couldn't find any memo with ID " + memoId + ". Perhaps it's already been unmemoized.");
            try {
                callback.apply(null, callbackParams || []);
                return true;
            }
            finally { delete memos[memoId]; }
        },

        unmemoizeDomNodeAndDescendants: function (domNode, extraCallbackParamsArray) {
            var memos = [];
            findMemoNodes(domNode, memos);
            for (var i = 0, j = memos.length; i < j; i++) {
                var node = memos[i].domNode;
                var combinedParams = [node];
                if (extraCallbackParamsArray)
                    ko.utils.arrayPushAll(combinedParams, extraCallbackParamsArray);
                ko.memoization.unmemoize(memos[i].memoId, combinedParams);
                node.nodeValue = ""; // Neuter this node so we don't try to unmemoize it again
                if (node.parentNode)
                    node.parentNode.removeChild(node); // If possible, erase it totally (not always possible - someone else might just hold a reference to it then call unmemoizeDomNodeAndDescendants again)
            }
        },

        parseMemoText: function (memoText) {
            var match = memoText.match(/^\[ko_memo\:(.*?)\]$/);
            return match ? match[1] : null;
        }
    };
})();

ko.exportSymbol('memoization', ko.memoization);
ko.exportSymbol('memoization.memoize', ko.memoization.memoize);
ko.exportSymbol('memoization.unmemoize', ko.memoization.unmemoize);
ko.exportSymbol('memoization.parseMemoText', ko.memoization.parseMemoText);
ko.exportSymbol('memoization.unmemoizeDomNodeAndDescendants', ko.memoization.unmemoizeDomNodeAndDescendants);
ko.extenders = {
    'throttle': function(target, timeout) {
        // Throttling means two things:

        // (1) For dependent observables, we throttle *evaluations* so that, no matter how fast its dependencies
        //     notify updates, the target doesn't re-evaluate (and hence doesn't notify) faster than a certain rate
        target['throttleEvaluation'] = timeout;

        // (2) For writable targets (observables, or writable dependent observables), we throttle *writes*
        //     so the target cannot change value synchronously or faster than a certain rate
        var writeTimeoutInstance = null;
        return ko.dependentObservable({
            'read': target,
            'write': function(value) {
                clearTimeout(writeTimeoutInstance);
                writeTimeoutInstance = setTimeout(function() {
                    target(value);
                }, timeout);
            }
        });
    },

    'notify': function(target, notifyWhen) {
        target["equalityComparer"] = notifyWhen == "always"
            ? function() { return false } // Treat all values as not equal
            : ko.observable["fn"]["equalityComparer"];
        return target;
    }
};

function applyExtenders(requestedExtenders) {
    var target = this;
    if (requestedExtenders) {
        for (var key in requestedExtenders) {
            var extenderHandler = ko.extenders[key];
            if (typeof extenderHandler == 'function') {
                target = extenderHandler(target, requestedExtenders[key]);
            }
        }
    }
    return target;
}

ko.exportSymbol('extenders', ko.extenders);

ko.subscription = function (target, callback, disposeCallback) {
    this.target = target;
    this.callback = callback;
    this.disposeCallback = disposeCallback;
    ko.exportProperty(this, 'dispose', this.dispose);
};
ko.subscription.prototype.dispose = function () {
    this.isDisposed = true;
    this.disposeCallback();
};

ko.subscribable = function () {
    this._subscriptions = {};

    ko.utils.extend(this, ko.subscribable['fn']);
    ko.exportProperty(this, 'subscribe', this.subscribe);
    ko.exportProperty(this, 'extend', this.extend);
    ko.exportProperty(this, 'getSubscriptionsCount', this.getSubscriptionsCount);
}

var defaultEvent = "change";

ko.subscribable['fn'] = {
    subscribe: function (callback, callbackTarget, event) {
        event = event || defaultEvent;
        var boundCallback = callbackTarget ? callback.bind(callbackTarget) : callback;

        var subscription = new ko.subscription(this, boundCallback, function () {
            ko.utils.arrayRemoveItem(this._subscriptions[event], subscription);
        }.bind(this));

        if (!this._subscriptions[event])
            this._subscriptions[event] = [];
        this._subscriptions[event].push(subscription);
        return subscription;
    },

    "notifySubscribers": function (valueToNotify, event) {
        event = event || defaultEvent;
        if (this._subscriptions[event]) {
            ko.dependencyDetection.ignore(function() {
                ko.utils.arrayForEach(this._subscriptions[event].slice(0), function (subscription) {
                    // In case a subscription was disposed during the arrayForEach cycle, check
                    // for isDisposed on each subscription before invoking its callback
                    if (subscription && (subscription.isDisposed !== true))
                        subscription.callback(valueToNotify);
                });
            }, this);
        }
    },

    getSubscriptionsCount: function () {
        var total = 0;
        for (var eventName in this._subscriptions) {
            if (this._subscriptions.hasOwnProperty(eventName))
                total += this._subscriptions[eventName].length;
        }
        return total;
    },

    extend: applyExtenders
};


ko.isSubscribable = function (instance) {
    return typeof instance.subscribe == "function" && typeof instance["notifySubscribers"] == "function";
};

ko.exportSymbol('subscribable', ko.subscribable);
ko.exportSymbol('isSubscribable', ko.isSubscribable);

ko.dependencyDetection = (function () {
    var _frames = [];

    return {
        begin: function (callback) {
            _frames.push({ callback: callback, distinctDependencies:[] });
        },

        end: function () {
            _frames.pop();
        },

        registerDependency: function (subscribable) {
            if (!ko.isSubscribable(subscribable))
                throw new Error("Only subscribable things can act as dependencies");
            if (_frames.length > 0) {
                var topFrame = _frames[_frames.length - 1];
                if (!topFrame || ko.utils.arrayIndexOf(topFrame.distinctDependencies, subscribable) >= 0)
                    return;
                topFrame.distinctDependencies.push(subscribable);
                topFrame.callback(subscribable);
            }
        },

        ignore: function(callback, callbackTarget, callbackArgs) {
            try {
                _frames.push(null);
                return callback.apply(callbackTarget, callbackArgs || []);
            } finally {
                _frames.pop();
            }
        }
    };
})();
var primitiveTypes = { 'undefined':true, 'boolean':true, 'number':true, 'string':true };

ko.observable = function (initialValue) {
    var _latestValue = initialValue;

    function observable() {
        if (arguments.length > 0) {
            // Write

            // Ignore writes if the value hasn't changed
            if ((!observable['equalityComparer']) || !observable['equalityComparer'](_latestValue, arguments[0])) {
                observable.valueWillMutate();
                _latestValue = arguments[0];
                if (DEBUG) observable._latestValue = _latestValue;
                observable.valueHasMutated();
            }
            return this; // Permits chained assignments
        }
        else {
            // Read
            ko.dependencyDetection.registerDependency(observable); // The caller only needs to be notified of changes if they did a "read" operation
            return _latestValue;
        }
    }
    if (DEBUG) observable._latestValue = _latestValue;
    ko.subscribable.call(observable);
    observable.peek = function() { return _latestValue };
    observable.valueHasMutated = function () { observable["notifySubscribers"](_latestValue); }
    observable.valueWillMutate = function () { observable["notifySubscribers"](_latestValue, "beforeChange"); }
    ko.utils.extend(observable, ko.observable['fn']);

    ko.exportProperty(observable, 'peek', observable.peek);
    ko.exportProperty(observable, "valueHasMutated", observable.valueHasMutated);
    ko.exportProperty(observable, "valueWillMutate", observable.valueWillMutate);

    return observable;
}

ko.observable['fn'] = {
    "equalityComparer": function valuesArePrimitiveAndEqual(a, b) {
        var oldValueIsPrimitive = (a === null) || (typeof(a) in primitiveTypes);
        return oldValueIsPrimitive ? (a === b) : false;
    }
};

var protoProperty = ko.observable.protoProperty = "__ko_proto__";
ko.observable['fn'][protoProperty] = ko.observable;

ko.hasPrototype = function(instance, prototype) {
    if ((instance === null) || (instance === undefined) || (instance[protoProperty] === undefined)) return false;
    if (instance[protoProperty] === prototype) return true;
    return ko.hasPrototype(instance[protoProperty], prototype); // Walk the prototype chain
};

ko.isObservable = function (instance) {
    return ko.hasPrototype(instance, ko.observable);
}
ko.isWriteableObservable = function (instance) {
    // Observable
    if ((typeof instance == "function") && instance[protoProperty] === ko.observable)
        return true;
    // Writeable dependent observable
    if ((typeof instance == "function") && (instance[protoProperty] === ko.dependentObservable) && (instance.hasWriteFunction))
        return true;
    // Anything else
    return false;
}


ko.exportSymbol('observable', ko.observable);
ko.exportSymbol('isObservable', ko.isObservable);
ko.exportSymbol('isWriteableObservable', ko.isWriteableObservable);
ko.observableArray = function (initialValues) {
    if (arguments.length == 0) {
        // Zero-parameter constructor initializes to empty array
        initialValues = [];
    }
    if ((initialValues !== null) && (initialValues !== undefined) && !('length' in initialValues))
        throw new Error("The argument passed when initializing an observable array must be an array, or null, or undefined.");

    var result = ko.observable(initialValues);
    ko.utils.extend(result, ko.observableArray['fn']);
    return result;
}

ko.observableArray['fn'] = {
    'remove': function (valueOrPredicate) {
        var underlyingArray = this.peek();
        var removedValues = [];
        var predicate = typeof valueOrPredicate == "function" ? valueOrPredicate : function (value) { return value === valueOrPredicate; };
        for (var i = 0; i < underlyingArray.length; i++) {
            var value = underlyingArray[i];
            if (predicate(value)) {
                if (removedValues.length === 0) {
                    this.valueWillMutate();
                }
                removedValues.push(value);
                underlyingArray.splice(i, 1);
                i--;
            }
        }
        if (removedValues.length) {
            this.valueHasMutated();
        }
        return removedValues;
    },

    'removeAll': function (arrayOfValues) {
        // If you passed zero args, we remove everything
        if (arrayOfValues === undefined) {
            var underlyingArray = this.peek();
            var allValues = underlyingArray.slice(0);
            this.valueWillMutate();
            underlyingArray.splice(0, underlyingArray.length);
            this.valueHasMutated();
            return allValues;
        }
        // If you passed an arg, we interpret it as an array of entries to remove
        if (!arrayOfValues)
            return [];
        return this['remove'](function (value) {
            return ko.utils.arrayIndexOf(arrayOfValues, value) >= 0;
        });
    },

    'destroy': function (valueOrPredicate) {
        var underlyingArray = this.peek();
        var predicate = typeof valueOrPredicate == "function" ? valueOrPredicate : function (value) { return value === valueOrPredicate; };
        this.valueWillMutate();
        for (var i = underlyingArray.length - 1; i >= 0; i--) {
            var value = underlyingArray[i];
            if (predicate(value))
                underlyingArray[i]["_destroy"] = true;
        }
        this.valueHasMutated();
    },

    'destroyAll': function (arrayOfValues) {
        // If you passed zero args, we destroy everything
        if (arrayOfValues === undefined)
            return this['destroy'](function() { return true });

        // If you passed an arg, we interpret it as an array of entries to destroy
        if (!arrayOfValues)
            return [];
        return this['destroy'](function (value) {
            return ko.utils.arrayIndexOf(arrayOfValues, value) >= 0;
        });
    },

    'indexOf': function (item) {
        var underlyingArray = this();
        return ko.utils.arrayIndexOf(underlyingArray, item);
    },

    'replace': function(oldItem, newItem) {
        var index = this['indexOf'](oldItem);
        if (index >= 0) {
            this.valueWillMutate();
            this.peek()[index] = newItem;
            this.valueHasMutated();
        }
    }
}

// Populate ko.observableArray.fn with read/write functions from native arrays
// Important: Do not add any additional functions here that may reasonably be used to *read* data from the array
// because we'll eval them without causing subscriptions, so ko.computed output could end up getting stale
ko.utils.arrayForEach(["pop", "push", "reverse", "shift", "sort", "splice", "unshift"], function (methodName) {
    ko.observableArray['fn'][methodName] = function () {
        // Use "peek" to avoid creating a subscription in any computed that we're executing in the context of
        // (for consistency with mutating regular observables)
        var underlyingArray = this.peek();
        this.valueWillMutate();
        var methodCallResult = underlyingArray[methodName].apply(underlyingArray, arguments);
        this.valueHasMutated();
        return methodCallResult;
    };
});

// Populate ko.observableArray.fn with read-only functions from native arrays
ko.utils.arrayForEach(["slice"], function (methodName) {
    ko.observableArray['fn'][methodName] = function () {
        var underlyingArray = this();
        return underlyingArray[methodName].apply(underlyingArray, arguments);
    };
});

ko.exportSymbol('observableArray', ko.observableArray);
ko.dependentObservable = function (evaluatorFunctionOrOptions, evaluatorFunctionTarget, options) {
    var _latestValue,
        _hasBeenEvaluated = false,
        _isBeingEvaluated = false,
        readFunction = evaluatorFunctionOrOptions;

    if (readFunction && typeof readFunction == "object") {
        // Single-parameter syntax - everything is on this "options" param
        options = readFunction;
        readFunction = options["read"];
    } else {
        // Multi-parameter syntax - construct the options according to the params passed
        options = options || {};
        if (!readFunction)
            readFunction = options["read"];
    }
    if (typeof readFunction != "function")
        throw new Error("Pass a function that returns the value of the ko.computed");

    function addSubscriptionToDependency(subscribable) {
        _subscriptionsToDependencies.push(subscribable.subscribe(evaluatePossiblyAsync));
    }

    function disposeAllSubscriptionsToDependencies() {
        ko.utils.arrayForEach(_subscriptionsToDependencies, function (subscription) {
            subscription.dispose();
        });
        _subscriptionsToDependencies = [];
    }

    function evaluatePossiblyAsync() {
        var throttleEvaluationTimeout = dependentObservable['throttleEvaluation'];
        if (throttleEvaluationTimeout && throttleEvaluationTimeout >= 0) {
            clearTimeout(evaluationTimeoutInstance);
            evaluationTimeoutInstance = setTimeout(evaluateImmediate, throttleEvaluationTimeout);
        } else
            evaluateImmediate();
    }

    function evaluateImmediate() {
        if (_isBeingEvaluated) {
            // If the evaluation of a ko.computed causes side effects, it's possible that it will trigger its own re-evaluation.
            // This is not desirable (it's hard for a developer to realise a chain of dependencies might cause this, and they almost
            // certainly didn't intend infinite re-evaluations). So, for predictability, we simply prevent ko.computeds from causing
            // their own re-evaluation. Further discussion at https://github.com/SteveSanderson/knockout/pull/387
            return;
        }

        // Don't dispose on first evaluation, because the "disposeWhen" callback might
        // e.g., dispose when the associated DOM element isn't in the doc, and it's not
        // going to be in the doc until *after* the first evaluation
        if (_hasBeenEvaluated && disposeWhen()) {
            dispose();
            return;
        }

        _isBeingEvaluated = true;
        try {
            // Initially, we assume that none of the subscriptions are still being used (i.e., all are candidates for disposal).
            // Then, during evaluation, we cross off any that are in fact still being used.
            var disposalCandidates = ko.utils.arrayMap(_subscriptionsToDependencies, function(item) {return item.target;});

            ko.dependencyDetection.begin(function(subscribable) {
                var inOld;
                if ((inOld = ko.utils.arrayIndexOf(disposalCandidates, subscribable)) >= 0)
                    disposalCandidates[inOld] = undefined; // Don't want to dispose this subscription, as it's still being used
                else
                    addSubscriptionToDependency(subscribable); // Brand new subscription - add it
            });

            var newValue = readFunction.call(evaluatorFunctionTarget);

            // For each subscription no longer being used, remove it from the active subscriptions list and dispose it
            for (var i = disposalCandidates.length - 1; i >= 0; i--) {
                if (disposalCandidates[i])
                    _subscriptionsToDependencies.splice(i, 1)[0].dispose();
            }
            _hasBeenEvaluated = true;

            dependentObservable["notifySubscribers"](_latestValue, "beforeChange");
            _latestValue = newValue;
            if (DEBUG) dependentObservable._latestValue = _latestValue;
        } finally {
            ko.dependencyDetection.end();
        }

        dependentObservable["notifySubscribers"](_latestValue);
        _isBeingEvaluated = false;
        if (!_subscriptionsToDependencies.length)
            dispose();
    }

    function dependentObservable() {
        if (arguments.length > 0) {
            if (typeof writeFunction === "function") {
                // Writing a value
                writeFunction.apply(evaluatorFunctionTarget, arguments);
            } else {
                throw new Error("Cannot write a value to a ko.computed unless you specify a 'write' option. If you wish to read the current value, don't pass any parameters.");
            }
            return this; // Permits chained assignments
        } else {
            // Reading the value
            if (!_hasBeenEvaluated)
                evaluateImmediate();
            ko.dependencyDetection.registerDependency(dependentObservable);
            return _latestValue;
        }
    }

    function peek() {
        if (!_hasBeenEvaluated)
            evaluateImmediate();
        return _latestValue;
    }

    function isActive() {
        return !_hasBeenEvaluated || _subscriptionsToDependencies.length > 0;
    }

    // By here, "options" is always non-null
    var writeFunction = options["write"],
        disposeWhenNodeIsRemoved = options["disposeWhenNodeIsRemoved"] || options.disposeWhenNodeIsRemoved || null,
        disposeWhen = options["disposeWhen"] || options.disposeWhen || function() { return false; },
        dispose = disposeAllSubscriptionsToDependencies,
        _subscriptionsToDependencies = [],
        evaluationTimeoutInstance = null;

    if (!evaluatorFunctionTarget)
        evaluatorFunctionTarget = options["owner"];

    dependentObservable.peek = peek;
    dependentObservable.getDependenciesCount = function () { return _subscriptionsToDependencies.length; };
    dependentObservable.hasWriteFunction = typeof options["write"] === "function";
    dependentObservable.dispose = function () { dispose(); };
    dependentObservable.isActive = isActive;

    ko.subscribable.call(dependentObservable);
    ko.utils.extend(dependentObservable, ko.dependentObservable['fn']);

    ko.exportProperty(dependentObservable, 'peek', dependentObservable.peek);
    ko.exportProperty(dependentObservable, 'dispose', dependentObservable.dispose);
    ko.exportProperty(dependentObservable, 'isActive', dependentObservable.isActive);
    ko.exportProperty(dependentObservable, 'getDependenciesCount', dependentObservable.getDependenciesCount);

    // Evaluate, unless deferEvaluation is true
    if (options['deferEvaluation'] !== true)
        evaluateImmediate();

    // Build "disposeWhenNodeIsRemoved" and "disposeWhenNodeIsRemovedCallback" option values.
    // But skip if isActive is false (there will never be any dependencies to dispose).
    // (Note: "disposeWhenNodeIsRemoved" option both proactively disposes as soon as the node is removed using ko.removeNode(),
    // plus adds a "disposeWhen" callback that, on each evaluation, disposes if the node was removed by some other means.)
    if (disposeWhenNodeIsRemoved && isActive()) {
        dispose = function() {
            ko.utils.domNodeDisposal.removeDisposeCallback(disposeWhenNodeIsRemoved, arguments.callee);
            disposeAllSubscriptionsToDependencies();
        };
        ko.utils.domNodeDisposal.addDisposeCallback(disposeWhenNodeIsRemoved, dispose);
        var existingDisposeWhenFunction = disposeWhen;
        disposeWhen = function () {
            return !ko.utils.domNodeIsAttachedToDocument(disposeWhenNodeIsRemoved) || existingDisposeWhenFunction();
        }
    }

    return dependentObservable;
};

ko.isComputed = function(instance) {
    return ko.hasPrototype(instance, ko.dependentObservable);
};

var protoProp = ko.observable.protoProperty; // == "__ko_proto__"
ko.dependentObservable[protoProp] = ko.observable;

ko.dependentObservable['fn'] = {};
ko.dependentObservable['fn'][protoProp] = ko.dependentObservable;

ko.exportSymbol('dependentObservable', ko.dependentObservable);
ko.exportSymbol('computed', ko.dependentObservable); // Make "ko.computed" an alias for "ko.dependentObservable"
ko.exportSymbol('isComputed', ko.isComputed);

(function() {
    var maxNestedObservableDepth = 10; // Escape the (unlikely) pathalogical case where an observable's current value is itself (or similar reference cycle)

    ko.toJS = function(rootObject) {
        if (arguments.length == 0)
            throw new Error("When calling ko.toJS, pass the object you want to convert.");

        // We just unwrap everything at every level in the object graph
        return mapJsObjectGraph(rootObject, function(valueToMap) {
            // Loop because an observable's value might in turn be another observable wrapper
            for (var i = 0; ko.isObservable(valueToMap) && (i < maxNestedObservableDepth); i++)
                valueToMap = valueToMap();
            return valueToMap;
        });
    };

    ko.toJSON = function(rootObject, replacer, space) {     // replacer and space are optional
        var plainJavaScriptObject = ko.toJS(rootObject);
        return ko.utils.stringifyJson(plainJavaScriptObject, replacer, space);
    };

    function mapJsObjectGraph(rootObject, mapInputCallback, visitedObjects) {
        visitedObjects = visitedObjects || new objectLookup();

        rootObject = mapInputCallback(rootObject);
        var canHaveProperties = (typeof rootObject == "object") && (rootObject !== null) && (rootObject !== undefined) && (!(rootObject instanceof Date));
        if (!canHaveProperties)
            return rootObject;

        var outputProperties = rootObject instanceof Array ? [] : {};
        visitedObjects.save(rootObject, outputProperties);

        visitPropertiesOrArrayEntries(rootObject, function(indexer) {
            var propertyValue = mapInputCallback(rootObject[indexer]);

            switch (typeof propertyValue) {
                case "boolean":
                case "number":
                case "string":
                case "function":
                    outputProperties[indexer] = propertyValue;
                    break;
                case "object":
                case "undefined":
                    var previouslyMappedValue = visitedObjects.get(propertyValue);
                    outputProperties[indexer] = (previouslyMappedValue !== undefined)
                        ? previouslyMappedValue
                        : mapJsObjectGraph(propertyValue, mapInputCallback, visitedObjects);
                    break;
            }
        });

        return outputProperties;
    }

    function visitPropertiesOrArrayEntries(rootObject, visitorCallback) {
        if (rootObject instanceof Array) {
            for (var i = 0; i < rootObject.length; i++)
                visitorCallback(i);

            // For arrays, also respect toJSON property for custom mappings (fixes #278)
            if (typeof rootObject['toJSON'] == 'function')
                visitorCallback('toJSON');
        } else {
            for (var propertyName in rootObject)
                visitorCallback(propertyName);
        }
    };

    function objectLookup() {
        var keys = [];
        var values = [];
        this.save = function(key, value) {
            var existingIndex = ko.utils.arrayIndexOf(keys, key);
            if (existingIndex >= 0)
                values[existingIndex] = value;
            else {
                keys.push(key);
                values.push(value);
            }
        };
        this.get = function(key) {
            var existingIndex = ko.utils.arrayIndexOf(keys, key);
            return (existingIndex >= 0) ? values[existingIndex] : undefined;
        };
    };
})();

ko.exportSymbol('toJS', ko.toJS);
ko.exportSymbol('toJSON', ko.toJSON);
(function () {
    var hasDomDataExpandoProperty = '__ko__hasDomDataOptionValue__';

    // Normally, SELECT elements and their OPTIONs can only take value of type 'string' (because the values
    // are stored on DOM attributes). ko.selectExtensions provides a way for SELECTs/OPTIONs to have values
    // that are arbitrary objects. This is very convenient when implementing things like cascading dropdowns.
    ko.selectExtensions = {
        readValue : function(element) {
            switch (ko.utils.tagNameLower(element)) {
                case 'option':
                    if (element[hasDomDataExpandoProperty] === true)
                        return ko.utils.domData.get(element, ko.bindingHandlers.options.optionValueDomDataKey);
                    return ko.utils.ieVersion <= 7
                        ? (element.getAttributeNode('value').specified ? element.value : element.text)
                        : element.value;
                case 'select':
                    return element.selectedIndex >= 0 ? ko.selectExtensions.readValue(element.options[element.selectedIndex]) : undefined;
                default:
                    return element.value;
            }
        },

        writeValue: function(element, value) {
            switch (ko.utils.tagNameLower(element)) {
                case 'option':
                    switch(typeof value) {
                        case "string":
                            ko.utils.domData.set(element, ko.bindingHandlers.options.optionValueDomDataKey, undefined);
                            if (hasDomDataExpandoProperty in element) { // IE <= 8 throws errors if you delete non-existent properties from a DOM node
                                delete element[hasDomDataExpandoProperty];
                            }
                            element.value = value;
                            break;
                        default:
                            // Store arbitrary object using DomData
                            ko.utils.domData.set(element, ko.bindingHandlers.options.optionValueDomDataKey, value);
                            element[hasDomDataExpandoProperty] = true;

                            // Special treatment of numbers is just for backward compatibility. KO 1.2.1 wrote numerical values to element.value.
                            element.value = typeof value === "number" ? value : "";
                            break;
                    }
                    break;
                case 'select':
                    for (var i = element.options.length - 1; i >= 0; i--) {
                        if (ko.selectExtensions.readValue(element.options[i]) == value) {
                            element.selectedIndex = i;
                            break;
                        }
                    }
                    break;
                default:
                    if ((value === null) || (value === undefined))
                        value = "";
                    element.value = value;
                    break;
            }
        }
    };
})();

ko.exportSymbol('selectExtensions', ko.selectExtensions);
ko.exportSymbol('selectExtensions.readValue', ko.selectExtensions.readValue);
ko.exportSymbol('selectExtensions.writeValue', ko.selectExtensions.writeValue);
ko.expressionRewriting = (function () {
    var restoreCapturedTokensRegex = /\@ko_token_(\d+)\@/g;
    var javaScriptReservedWords = ["true", "false"];

    // Matches something that can be assigned to--either an isolated identifier or something ending with a property accessor
    // This is designed to be simple and avoid false negatives, but could produce false positives (e.g., a+b.c).
    var javaScriptAssignmentTarget = /^(?:[$_a-z][$\w]*|(.+)(\.\s*[$_a-z][$\w]*|\[.+\]))$/i;

    function restoreTokens(string, tokens) {
        var prevValue = null;
        while (string != prevValue) { // Keep restoring tokens until it no longer makes a difference (they may be nested)
            prevValue = string;
            string = string.replace(restoreCapturedTokensRegex, function (match, tokenIndex) {
                return tokens[tokenIndex];
            });
        }
        return string;
    }

    function getWriteableValue(expression) {
        if (ko.utils.arrayIndexOf(javaScriptReservedWords, ko.utils.stringTrim(expression).toLowerCase()) >= 0)
            return false;
        var match = expression.match(javaScriptAssignmentTarget);
        return match === null ? false : match[1] ? ('Object(' + match[1] + ')' + match[2]) : expression;
    }

    function ensureQuoted(key) {
        var trimmedKey = ko.utils.stringTrim(key);
        switch (trimmedKey.length && trimmedKey.charAt(0)) {
            case "'":
            case '"':
                return key;
            default:
                return "'" + trimmedKey + "'";
        }
    }

    return {
        bindingRewriteValidators: [],

        parseObjectLiteral: function(objectLiteralString) {
            // A full tokeniser+lexer would add too much weight to this library, so here's a simple parser
            // that is sufficient just to split an object literal string into a set of top-level key-value pairs

            var str = ko.utils.stringTrim(objectLiteralString);
            if (str.length < 3)
                return [];
            if (str.charAt(0) === "{")// Ignore any braces surrounding the whole object literal
                str = str.substring(1, str.length - 1);

            // Pull out any string literals and regex literals
            var tokens = [];
            var tokenStart = null, tokenEndChar;
            for (var position = 0; position < str.length; position++) {
                var c = str.charAt(position);
                if (tokenStart === null) {
                    switch (c) {
                        case '"':
                        case "'":
                        case "/":
                            tokenStart = position;
                            tokenEndChar = c;
                            break;
                    }
                } else if ((c == tokenEndChar) && (str.charAt(position - 1) !== "\\")) {
                    var token = str.substring(tokenStart, position + 1);
                    tokens.push(token);
                    var replacement = "@ko_token_" + (tokens.length - 1) + "@";
                    str = str.substring(0, tokenStart) + replacement + str.substring(position + 1);
                    position -= (token.length - replacement.length);
                    tokenStart = null;
                }
            }

            // Next pull out balanced paren, brace, and bracket blocks
            tokenStart = null;
            tokenEndChar = null;
            var tokenDepth = 0, tokenStartChar = null;
            for (var position = 0; position < str.length; position++) {
                var c = str.charAt(position);
                if (tokenStart === null) {
                    switch (c) {
                        case "{": tokenStart = position; tokenStartChar = c;
                                  tokenEndChar = "}";
                                  break;
                        case "(": tokenStart = position; tokenStartChar = c;
                                  tokenEndChar = ")";
                                  break;
                        case "[": tokenStart = position; tokenStartChar = c;
                                  tokenEndChar = "]";
                                  break;
                    }
                }

                if (c === tokenStartChar)
                    tokenDepth++;
                else if (c === tokenEndChar) {
                    tokenDepth--;
                    if (tokenDepth === 0) {
                        var token = str.substring(tokenStart, position + 1);
                        tokens.push(token);
                        var replacement = "@ko_token_" + (tokens.length - 1) + "@";
                        str = str.substring(0, tokenStart) + replacement + str.substring(position + 1);
                        position -= (token.length - replacement.length);
                        tokenStart = null;
                    }
                }
            }

            // Now we can safely split on commas to get the key/value pairs
            var result = [];
            var keyValuePairs = str.split(",");
            for (var i = 0, j = keyValuePairs.length; i < j; i++) {
                var pair = keyValuePairs[i];
                var colonPos = pair.indexOf(":");
                if ((colonPos > 0) && (colonPos < pair.length - 1)) {
                    var key = pair.substring(0, colonPos);
                    var value = pair.substring(colonPos + 1);
                    result.push({ 'key': restoreTokens(key, tokens), 'value': restoreTokens(value, tokens) });
                } else {
                    result.push({ 'unknown': restoreTokens(pair, tokens) });
                }
            }
            return result;
        },

        preProcessBindings: function (objectLiteralStringOrKeyValueArray) {
            var keyValueArray = typeof objectLiteralStringOrKeyValueArray === "string"
                ? ko.expressionRewriting.parseObjectLiteral(objectLiteralStringOrKeyValueArray)
                : objectLiteralStringOrKeyValueArray;
            var resultStrings = [], propertyAccessorResultStrings = [];

            var keyValueEntry;
            for (var i = 0; keyValueEntry = keyValueArray[i]; i++) {
                if (resultStrings.length > 0)
                    resultStrings.push(",");

                if (keyValueEntry['key']) {
                    var quotedKey = ensureQuoted(keyValueEntry['key']), val = keyValueEntry['value'];
                    resultStrings.push(quotedKey);
                    resultStrings.push(":");
                    resultStrings.push(val);

                    if (val = getWriteableValue(ko.utils.stringTrim(val))) {
                        if (propertyAccessorResultStrings.length > 0)
                            propertyAccessorResultStrings.push(", ");
                        propertyAccessorResultStrings.push(quotedKey + " : function(__ko_value) { " + val + " = __ko_value; }");
                    }
                } else if (keyValueEntry['unknown']) {
                    resultStrings.push(keyValueEntry['unknown']);
                }
            }

            var combinedResult = resultStrings.join("");
            if (propertyAccessorResultStrings.length > 0) {
                var allPropertyAccessors = propertyAccessorResultStrings.join("");
                combinedResult = combinedResult + ", '_ko_property_writers' : { " + allPropertyAccessors + " } ";
            }

            return combinedResult;
        },

        keyValueArrayContainsKey: function(keyValueArray, key) {
            for (var i = 0; i < keyValueArray.length; i++)
                if (ko.utils.stringTrim(keyValueArray[i]['key']) == key)
                    return true;
            return false;
        },

        // Internal, private KO utility for updating model properties from within bindings
        // property:            If the property being updated is (or might be) an observable, pass it here
        //                      If it turns out to be a writable observable, it will be written to directly
        // allBindingsAccessor: All bindings in the current execution context.
        //                      This will be searched for a '_ko_property_writers' property in case you're writing to a non-observable
        // key:                 The key identifying the property to be written. Example: for { hasFocus: myValue }, write to 'myValue' by specifying the key 'hasFocus'
        // value:               The value to be written
        // checkIfDifferent:    If true, and if the property being written is a writable observable, the value will only be written if
        //                      it is !== existing value on that writable observable
        writeValueToProperty: function(property, allBindingsAccessor, key, value, checkIfDifferent) {
            if (!property || !ko.isWriteableObservable(property)) {
                var propWriters = allBindingsAccessor()['_ko_property_writers'];
                if (propWriters && propWriters[key])
                    propWriters[key](value);
            } else if (!checkIfDifferent || property.peek() !== value) {
                property(value);
            }
        }
    };
})();

ko.exportSymbol('expressionRewriting', ko.expressionRewriting);
ko.exportSymbol('expressionRewriting.bindingRewriteValidators', ko.expressionRewriting.bindingRewriteValidators);
ko.exportSymbol('expressionRewriting.parseObjectLiteral', ko.expressionRewriting.parseObjectLiteral);
ko.exportSymbol('expressionRewriting.preProcessBindings', ko.expressionRewriting.preProcessBindings);

// For backward compatibility, define the following aliases. (Previously, these function names were misleading because
// they referred to JSON specifically, even though they actually work with arbitrary JavaScript object literal expressions.)
ko.exportSymbol('jsonExpressionRewriting', ko.expressionRewriting);
ko.exportSymbol('jsonExpressionRewriting.insertPropertyAccessorsIntoJson', ko.expressionRewriting.preProcessBindings);(function() {
    // "Virtual elements" is an abstraction on top of the usual DOM API which understands the notion that comment nodes
    // may be used to represent hierarchy (in addition to the DOM's natural hierarchy).
    // If you call the DOM-manipulating functions on ko.virtualElements, you will be able to read and write the state
    // of that virtual hierarchy
    //
    // The point of all this is to support containerless templates (e.g., <!-- ko foreach:someCollection -->blah<!-- /ko -->)
    // without having to scatter special cases all over the binding and templating code.

    // IE 9 cannot reliably read the "nodeValue" property of a comment node (see https://github.com/SteveSanderson/knockout/issues/186)
    // but it does give them a nonstandard alternative property called "text" that it can read reliably. Other browsers don't have that property.
    // So, use node.text where available, and node.nodeValue elsewhere
    var commentNodesHaveTextProperty = document.createComment("test").text === "<!--test-->";

    var startCommentRegex = commentNodesHaveTextProperty ? /^<!--\s*ko(?:\s+(.+\s*\:[\s\S]*))?\s*-->$/ : /^\s*ko(?:\s+(.+\s*\:[\s\S]*))?\s*$/;
    var endCommentRegex =   commentNodesHaveTextProperty ? /^<!--\s*\/ko\s*-->$/ : /^\s*\/ko\s*$/;
    var htmlTagsWithOptionallyClosingChildren = { 'ul': true, 'ol': true };

    function isStartComment(node) {
        return (node.nodeType == 8) && (commentNodesHaveTextProperty ? node.text : node.nodeValue).match(startCommentRegex);
    }

    function isEndComment(node) {
        return (node.nodeType == 8) && (commentNodesHaveTextProperty ? node.text : node.nodeValue).match(endCommentRegex);
    }

    function getVirtualChildren(startComment, allowUnbalanced) {
        var currentNode = startComment;
        var depth = 1;
        var children = [];
        while (currentNode = currentNode.nextSibling) {
            if (isEndComment(currentNode)) {
                depth--;
                if (depth === 0)
                    return children;
            }

            children.push(currentNode);

            if (isStartComment(currentNode))
                depth++;
        }
        if (!allowUnbalanced)
            throw new Error("Cannot find closing comment tag to match: " + startComment.nodeValue);
        return null;
    }

    function getMatchingEndComment(startComment, allowUnbalanced) {
        var allVirtualChildren = getVirtualChildren(startComment, allowUnbalanced);
        if (allVirtualChildren) {
            if (allVirtualChildren.length > 0)
                return allVirtualChildren[allVirtualChildren.length - 1].nextSibling;
            return startComment.nextSibling;
        } else
            return null; // Must have no matching end comment, and allowUnbalanced is true
    }

    function getUnbalancedChildTags(node) {
        // e.g., from <div>OK</div><!-- ko blah --><span>Another</span>, returns: <!-- ko blah --><span>Another</span>
        //       from <div>OK</div><!-- /ko --><!-- /ko -->,             returns: <!-- /ko --><!-- /ko -->
        var childNode = node.firstChild, captureRemaining = null;
        if (childNode) {
            do {
                if (captureRemaining)                   // We already hit an unbalanced node and are now just scooping up all subsequent nodes
                    captureRemaining.push(childNode);
                else if (isStartComment(childNode)) {
                    var matchingEndComment = getMatchingEndComment(childNode, /* allowUnbalanced: */ true);
                    if (matchingEndComment)             // It's a balanced tag, so skip immediately to the end of this virtual set
                        childNode = matchingEndComment;
                    else
                        captureRemaining = [childNode]; // It's unbalanced, so start capturing from this point
                } else if (isEndComment(childNode)) {
                    captureRemaining = [childNode];     // It's unbalanced (if it wasn't, we'd have skipped over it already), so start capturing
                }
            } while (childNode = childNode.nextSibling);
        }
        return captureRemaining;
    }

    ko.virtualElements = {
        allowedBindings: {},

        childNodes: function(node) {
            return isStartComment(node) ? getVirtualChildren(node) : node.childNodes;
        },

        emptyNode: function(node) {
            if (!isStartComment(node))
                ko.utils.emptyDomNode(node);
            else {
                var virtualChildren = ko.virtualElements.childNodes(node);
                for (var i = 0, j = virtualChildren.length; i < j; i++)
                    ko.removeNode(virtualChildren[i]);
            }
        },

        setDomNodeChildren: function(node, childNodes) {
            if (!isStartComment(node))
                ko.utils.setDomNodeChildren(node, childNodes);
            else {
                ko.virtualElements.emptyNode(node);
                var endCommentNode = node.nextSibling; // Must be the next sibling, as we just emptied the children
                for (var i = 0, j = childNodes.length; i < j; i++)
                    endCommentNode.parentNode.insertBefore(childNodes[i], endCommentNode);
            }
        },

        prepend: function(containerNode, nodeToPrepend) {
            if (!isStartComment(containerNode)) {
                if (containerNode.firstChild)
                    containerNode.insertBefore(nodeToPrepend, containerNode.firstChild);
                else
                    containerNode.appendChild(nodeToPrepend);
            } else {
                // Start comments must always have a parent and at least one following sibling (the end comment)
                containerNode.parentNode.insertBefore(nodeToPrepend, containerNode.nextSibling);
            }
        },

        insertAfter: function(containerNode, nodeToInsert, insertAfterNode) {
            if (!insertAfterNode) {
                ko.virtualElements.prepend(containerNode, nodeToInsert);
            } else if (!isStartComment(containerNode)) {
                // Insert after insertion point
                if (insertAfterNode.nextSibling)
                    containerNode.insertBefore(nodeToInsert, insertAfterNode.nextSibling);
                else
                    containerNode.appendChild(nodeToInsert);
            } else {
                // Children of start comments must always have a parent and at least one following sibling (the end comment)
                containerNode.parentNode.insertBefore(nodeToInsert, insertAfterNode.nextSibling);
            }
        },

        firstChild: function(node) {
            if (!isStartComment(node))
                return node.firstChild;
            if (!node.nextSibling || isEndComment(node.nextSibling))
                return null;
            return node.nextSibling;
        },

        nextSibling: function(node) {
            if (isStartComment(node))
                node = getMatchingEndComment(node);
            if (node.nextSibling && isEndComment(node.nextSibling))
                return null;
            return node.nextSibling;
        },

        virtualNodeBindingValue: function(node) {
            var regexMatch = isStartComment(node);
            return regexMatch ? regexMatch[1] : null;
        },

        normaliseVirtualElementDomStructure: function(elementVerified) {
            // Workaround for https://github.com/SteveSanderson/knockout/issues/155
            // (IE <= 8 or IE 9 quirks mode parses your HTML weirdly, treating closing </li> tags as if they don't exist, thereby moving comment nodes
            // that are direct descendants of <ul> into the preceding <li>)
            if (!htmlTagsWithOptionallyClosingChildren[ko.utils.tagNameLower(elementVerified)])
                return;

            // Scan immediate children to see if they contain unbalanced comment tags. If they do, those comment tags
            // must be intended to appear *after* that child, so move them there.
            var childNode = elementVerified.firstChild;
            if (childNode) {
                do {
                    if (childNode.nodeType === 1) {
                        var unbalancedTags = getUnbalancedChildTags(childNode);
                        if (unbalancedTags) {
                            // Fix up the DOM by moving the unbalanced tags to where they most likely were intended to be placed - *after* the child
                            var nodeToInsertBefore = childNode.nextSibling;
                            for (var i = 0; i < unbalancedTags.length; i++) {
                                if (nodeToInsertBefore)
                                    elementVerified.insertBefore(unbalancedTags[i], nodeToInsertBefore);
                                else
                                    elementVerified.appendChild(unbalancedTags[i]);
                            }
                        }
                    }
                } while (childNode = childNode.nextSibling);
            }
        }
    };
})();
ko.exportSymbol('virtualElements', ko.virtualElements);
ko.exportSymbol('virtualElements.allowedBindings', ko.virtualElements.allowedBindings);
ko.exportSymbol('virtualElements.emptyNode', ko.virtualElements.emptyNode);
//ko.exportSymbol('virtualElements.firstChild', ko.virtualElements.firstChild);     // firstChild is not minified
ko.exportSymbol('virtualElements.insertAfter', ko.virtualElements.insertAfter);
//ko.exportSymbol('virtualElements.nextSibling', ko.virtualElements.nextSibling);   // nextSibling is not minified
ko.exportSymbol('virtualElements.prepend', ko.virtualElements.prepend);
ko.exportSymbol('virtualElements.setDomNodeChildren', ko.virtualElements.setDomNodeChildren);
(function() {
    var defaultBindingAttributeName = "data-bind";

    ko.bindingProvider = function() {
        this.bindingCache = {};
    };

    ko.utils.extend(ko.bindingProvider.prototype, {
        'nodeHasBindings': function(node) {
            switch (node.nodeType) {
                case 1: return node.getAttribute(defaultBindingAttributeName) != null;   // Element
                case 8: return ko.virtualElements.virtualNodeBindingValue(node) != null; // Comment node
                default: return false;
            }
        },

        'getBindings': function(node, bindingContext) {
            var bindingsString = this['getBindingsString'](node, bindingContext);
            return bindingsString ? this['parseBindingsString'](bindingsString, bindingContext, node) : null;
        },

        // The following function is only used internally by this default provider.
        // It's not part of the interface definition for a general binding provider.
        'getBindingsString': function(node, bindingContext) {
            switch (node.nodeType) {
                case 1: return node.getAttribute(defaultBindingAttributeName);   // Element
                case 8: return ko.virtualElements.virtualNodeBindingValue(node); // Comment node
                default: return null;
            }
        },

        // The following function is only used internally by this default provider.
        // It's not part of the interface definition for a general binding provider.
        'parseBindingsString': function(bindingsString, bindingContext, node) {
            try {
                var bindingFunction = createBindingsStringEvaluatorViaCache(bindingsString, this.bindingCache);
                return bindingFunction(bindingContext, node);
            } catch (ex) {
                throw new Error("Unable to parse bindings.\nMessage: " + ex + ";\nBindings value: " + bindingsString);
            }
        }
    });

    ko.bindingProvider['instance'] = new ko.bindingProvider();

    function createBindingsStringEvaluatorViaCache(bindingsString, cache) {
        var cacheKey = bindingsString;
        return cache[cacheKey]
            || (cache[cacheKey] = createBindingsStringEvaluator(bindingsString));
    }

    function createBindingsStringEvaluator(bindingsString) {
        // Build the source for a function that evaluates "expression"
        // For each scope variable, add an extra level of "with" nesting
        // Example result: with(sc1) { with(sc0) { return (expression) } }
        var rewrittenBindings = ko.expressionRewriting.preProcessBindings(bindingsString),
            functionBody = "with($context){with($data||{}){return{" + rewrittenBindings + "}}}";
        return new Function("$context", "$element", functionBody);
    }
})();

ko.exportSymbol('bindingProvider', ko.bindingProvider);
(function () {
    ko.bindingHandlers = {};

    ko.bindingContext = function(dataItem, parentBindingContext, dataItemAlias) {
        if (parentBindingContext) {
            ko.utils.extend(this, parentBindingContext); // Inherit $root and any custom properties
            this['$parentContext'] = parentBindingContext;
            this['$parent'] = parentBindingContext['$data'];
            this['$parents'] = (parentBindingContext['$parents'] || []).slice(0);
            this['$parents'].unshift(this['$parent']);
        } else {
            this['$parents'] = [];
            this['$root'] = dataItem;
            // Export 'ko' in the binding context so it will be available in bindings and templates
            // even if 'ko' isn't exported as a global, such as when using an AMD loader.
            // See https://github.com/SteveSanderson/knockout/issues/490
            this['ko'] = ko;
        }
        this['$data'] = dataItem;
        if (dataItemAlias)
            this[dataItemAlias] = dataItem;
    }
    ko.bindingContext.prototype['createChildContext'] = function (dataItem, dataItemAlias) {
        return new ko.bindingContext(dataItem, this, dataItemAlias);
    };
    ko.bindingContext.prototype['extend'] = function(properties) {
        var clone = ko.utils.extend(new ko.bindingContext(), this);
        return ko.utils.extend(clone, properties);
    };

    function validateThatBindingIsAllowedForVirtualElements(bindingName) {
        var validator = ko.virtualElements.allowedBindings[bindingName];
        if (!validator)
            throw new Error("The binding '" + bindingName + "' cannot be used with virtual elements")
    }

    function applyBindingsToDescendantsInternal (viewModel, elementOrVirtualElement, bindingContextsMayDifferFromDomParentElement) {
        var currentChild, nextInQueue = ko.virtualElements.firstChild(elementOrVirtualElement);
        while (currentChild = nextInQueue) {
            // Keep a record of the next child *before* applying bindings, in case the binding removes the current child from its position
            nextInQueue = ko.virtualElements.nextSibling(currentChild);
            applyBindingsToNodeAndDescendantsInternal(viewModel, currentChild, bindingContextsMayDifferFromDomParentElement);
        }
    }

    function applyBindingsToNodeAndDescendantsInternal (viewModel, nodeVerified, bindingContextMayDifferFromDomParentElement) {
        var shouldBindDescendants = true;

        // Perf optimisation: Apply bindings only if...
        // (1) We need to store the binding context on this node (because it may differ from the DOM parent node's binding context)
        //     Note that we can't store binding contexts on non-elements (e.g., text nodes), as IE doesn't allow expando properties for those
        // (2) It might have bindings (e.g., it has a data-bind attribute, or it's a marker for a containerless template)
        var isElement = (nodeVerified.nodeType === 1);
        if (isElement) // Workaround IE <= 8 HTML parsing weirdness
            ko.virtualElements.normaliseVirtualElementDomStructure(nodeVerified);

        var shouldApplyBindings = (isElement && bindingContextMayDifferFromDomParentElement)             // Case (1)
                               || ko.bindingProvider['instance']['nodeHasBindings'](nodeVerified);       // Case (2)
        if (shouldApplyBindings)
            shouldBindDescendants = applyBindingsToNodeInternal(nodeVerified, null, viewModel, bindingContextMayDifferFromDomParentElement).shouldBindDescendants;

        if (shouldBindDescendants) {
            // We're recursing automatically into (real or virtual) child nodes without changing binding contexts. So,
            //  * For children of a *real* element, the binding context is certainly the same as on their DOM .parentNode,
            //    hence bindingContextsMayDifferFromDomParentElement is false
            //  * For children of a *virtual* element, we can't be sure. Evaluating .parentNode on those children may
            //    skip over any number of intermediate virtual elements, any of which might define a custom binding context,
            //    hence bindingContextsMayDifferFromDomParentElement is true
            applyBindingsToDescendantsInternal(viewModel, nodeVerified, /* bindingContextsMayDifferFromDomParentElement: */ !isElement);
        }
    }

    function applyBindingsToNodeInternal (node, bindings, viewModelOrBindingContext, bindingContextMayDifferFromDomParentElement) {
        // Need to be sure that inits are only run once, and updates never run until all the inits have been run
        var initPhase = 0; // 0 = before all inits, 1 = during inits, 2 = after all inits

        // Each time the dependentObservable is evaluated (after data changes),
        // the binding attribute is reparsed so that it can pick out the correct
        // model properties in the context of the changed data.
        // DOM event callbacks need to be able to access this changed data,
        // so we need a single parsedBindings variable (shared by all callbacks
        // associated with this node's bindings) that all the closures can access.
        var parsedBindings;
        function makeValueAccessor(bindingKey) {
            return function () { return parsedBindings[bindingKey] }
        }
        function parsedBindingsAccessor() {
            return parsedBindings;
        }

        var bindingHandlerThatControlsDescendantBindings;
        ko.dependentObservable(
            function () {
                // Ensure we have a nonnull binding context to work with
                var bindingContextInstance = viewModelOrBindingContext && (viewModelOrBindingContext instanceof ko.bindingContext)
                    ? viewModelOrBindingContext
                    : new ko.bindingContext(ko.utils.unwrapObservable(viewModelOrBindingContext));
                var viewModel = bindingContextInstance['$data'];

                // Optimization: Don't store the binding context on this node if it's definitely the same as on node.parentNode, because
                // we can easily recover it just by scanning up the node's ancestors in the DOM
                // (note: here, parent node means "real DOM parent" not "virtual parent", as there's no O(1) way to find the virtual parent)
                if (bindingContextMayDifferFromDomParentElement)
                    ko.storedBindingContextForNode(node, bindingContextInstance);

                // Use evaluatedBindings if given, otherwise fall back on asking the bindings provider to give us some bindings
                var evaluatedBindings = (typeof bindings == "function") ? bindings(bindingContextInstance, node) : bindings;
                parsedBindings = evaluatedBindings || ko.bindingProvider['instance']['getBindings'](node, bindingContextInstance);

                if (parsedBindings) {
                    // First run all the inits, so bindings can register for notification on changes
                    if (initPhase === 0) {
                        initPhase = 1;
                        for (var bindingKey in parsedBindings) {
                            var binding = ko.bindingHandlers[bindingKey];
                            if (binding && node.nodeType === 8)
                                validateThatBindingIsAllowedForVirtualElements(bindingKey);

                            if (binding && typeof binding["init"] == "function") {
                                var handlerInitFn = binding["init"];
                                var initResult = handlerInitFn(node, makeValueAccessor(bindingKey), parsedBindingsAccessor, viewModel, bindingContextInstance);

                                // If this binding handler claims to control descendant bindings, make a note of this
                                if (initResult && initResult['controlsDescendantBindings']) {
                                    if (bindingHandlerThatControlsDescendantBindings !== undefined)
                                        throw new Error("Multiple bindings (" + bindingHandlerThatControlsDescendantBindings + " and " + bindingKey + ") are trying to control descendant bindings of the same element. You cannot use these bindings together on the same element.");
                                    bindingHandlerThatControlsDescendantBindings = bindingKey;
                                }
                            }
                        }
                        initPhase = 2;
                    }

                    // ... then run all the updates, which might trigger changes even on the first evaluation
                    if (initPhase === 2) {
                        for (var bindingKey in parsedBindings) {
                            var binding = ko.bindingHandlers[bindingKey];
                            if (binding && typeof binding["update"] == "function") {
                                var handlerUpdateFn = binding["update"];
                                handlerUpdateFn(node, makeValueAccessor(bindingKey), parsedBindingsAccessor, viewModel, bindingContextInstance);
                            }
                        }
                    }
                }
            },
            null,
            { disposeWhenNodeIsRemoved : node }
        );

        return {
            shouldBindDescendants: bindingHandlerThatControlsDescendantBindings === undefined
        };
    };

    var storedBindingContextDomDataKey = "__ko_bindingContext__";
    ko.storedBindingContextForNode = function (node, bindingContext) {
        if (arguments.length == 2)
            ko.utils.domData.set(node, storedBindingContextDomDataKey, bindingContext);
        else
            return ko.utils.domData.get(node, storedBindingContextDomDataKey);
    }

    ko.applyBindingsToNode = function (node, bindings, viewModel) {
        if (node.nodeType === 1) // If it's an element, workaround IE <= 8 HTML parsing weirdness
            ko.virtualElements.normaliseVirtualElementDomStructure(node);
        return applyBindingsToNodeInternal(node, bindings, viewModel, true);
    };

    ko.applyBindingsToDescendants = function(viewModel, rootNode) {
        if (rootNode.nodeType === 1 || rootNode.nodeType === 8)
            applyBindingsToDescendantsInternal(viewModel, rootNode, true);
    };

    ko.applyBindings = function (viewModel, rootNode) {
        if (rootNode && (rootNode.nodeType !== 1) && (rootNode.nodeType !== 8))
            throw new Error("ko.applyBindings: first parameter should be your view model; second parameter should be a DOM node");
        rootNode = rootNode || window.document.body; // Make "rootNode" parameter optional

        applyBindingsToNodeAndDescendantsInternal(viewModel, rootNode, true);
    };

    // Retrieving binding context from arbitrary nodes
    ko.contextFor = function(node) {
        // We can only do something meaningful for elements and comment nodes (in particular, not text nodes, as IE can't store domdata for them)
        switch (node.nodeType) {
            case 1:
            case 8:
                var context = ko.storedBindingContextForNode(node);
                if (context) return context;
                if (node.parentNode) return ko.contextFor(node.parentNode);
                break;
        }
        return undefined;
    };
    ko.dataFor = function(node) {
        var context = ko.contextFor(node);
        return context ? context['$data'] : undefined;
    };

    ko.exportSymbol('bindingHandlers', ko.bindingHandlers);
    ko.exportSymbol('applyBindings', ko.applyBindings);
    ko.exportSymbol('applyBindingsToDescendants', ko.applyBindingsToDescendants);
    ko.exportSymbol('applyBindingsToNode', ko.applyBindingsToNode);
    ko.exportSymbol('contextFor', ko.contextFor);
    ko.exportSymbol('dataFor', ko.dataFor);
})();
var attrHtmlToJavascriptMap = { 'class': 'className', 'for': 'htmlFor' };
ko.bindingHandlers['attr'] = {
    'update': function(element, valueAccessor, allBindingsAccessor) {
        var value = ko.utils.unwrapObservable(valueAccessor()) || {};
        for (var attrName in value) {
            if (typeof attrName == "string") {
                var attrValue = ko.utils.unwrapObservable(value[attrName]);

                // To cover cases like "attr: { checked:someProp }", we want to remove the attribute entirely
                // when someProp is a "no value"-like value (strictly null, false, or undefined)
                // (because the absence of the "checked" attr is how to mark an element as not checked, etc.)
                var toRemove = (attrValue === false) || (attrValue === null) || (attrValue === undefined);
                if (toRemove)
                    element.removeAttribute(attrName);

                // In IE <= 7 and IE8 Quirks Mode, you have to use the Javascript property name instead of the
                // HTML attribute name for certain attributes. IE8 Standards Mode supports the correct behavior,
                // but instead of figuring out the mode, we'll just set the attribute through the Javascript
                // property for IE <= 8.
                if (ko.utils.ieVersion <= 8 && attrName in attrHtmlToJavascriptMap) {
                    attrName = attrHtmlToJavascriptMap[attrName];
                    if (toRemove)
                        element.removeAttribute(attrName);
                    else
                        element[attrName] = attrValue;
                } else if (!toRemove) {
                    element.setAttribute(attrName, attrValue.toString());
                }

                // Treat "name" specially - although you can think of it as an attribute, it also needs
                // special handling on older versions of IE (https://github.com/SteveSanderson/knockout/pull/333)
                // Deliberately being case-sensitive here because XHTML would regard "Name" as a different thing
                // entirely, and there's no strong reason to allow for such casing in HTML.
                if (attrName === "name") {
                    ko.utils.setElementName(element, toRemove ? "" : attrValue.toString());
                }
            }
        }
    }
};
ko.bindingHandlers['checked'] = {
    'init': function (element, valueAccessor, allBindingsAccessor) {
        var updateHandler = function() {
            var valueToWrite;
            if (element.type == "checkbox") {
                valueToWrite = element.checked;
            } else if ((element.type == "radio") && (element.checked)) {
                valueToWrite = element.value;
            } else {
                return; // "checked" binding only responds to checkboxes and selected radio buttons
            }

            var modelValue = valueAccessor(), unwrappedValue = ko.utils.unwrapObservable(modelValue);
            if ((element.type == "checkbox") && (unwrappedValue instanceof Array)) {
                // For checkboxes bound to an array, we add/remove the checkbox value to that array
                // This works for both observable and non-observable arrays
                var existingEntryIndex = ko.utils.arrayIndexOf(unwrappedValue, element.value);
                if (element.checked && (existingEntryIndex < 0))
                    modelValue.push(element.value);
                else if ((!element.checked) && (existingEntryIndex >= 0))
                    modelValue.splice(existingEntryIndex, 1);
            } else {
                ko.expressionRewriting.writeValueToProperty(modelValue, allBindingsAccessor, 'checked', valueToWrite, true);
            }
        };
        ko.utils.registerEventHandler(element, "click", updateHandler);

        // IE 6 won't allow radio buttons to be selected unless they have a name
        if ((element.type == "radio") && !element.name)
            ko.bindingHandlers['uniqueName']['init'](element, function() { return true });
    },
    'update': function (element, valueAccessor) {
        var value = ko.utils.unwrapObservable(valueAccessor());

        if (element.type == "checkbox") {
            if (value instanceof Array) {
                // When bound to an array, the checkbox being checked represents its value being present in that array
                element.checked = ko.utils.arrayIndexOf(value, element.value) >= 0;
            } else {
                // When bound to anything other value (not an array), the checkbox being checked represents the value being trueish
                element.checked = value;
            }
        } else if (element.type == "radio") {
            element.checked = (element.value == value);
        }
    }
};
var classesWrittenByBindingKey = '__ko__cssValue';
ko.bindingHandlers['css'] = {
    'update': function (element, valueAccessor) {
        var value = ko.utils.unwrapObservable(valueAccessor());
        if (typeof value == "object") {
            for (var className in value) {
                var shouldHaveClass = ko.utils.unwrapObservable(value[className]);
                ko.utils.toggleDomNodeCssClass(element, className, shouldHaveClass);
            }
        } else {
            value = String(value || ''); // Make sure we don't try to store or set a non-string value
            ko.utils.toggleDomNodeCssClass(element, element[classesWrittenByBindingKey], false);
            element[classesWrittenByBindingKey] = value;
            ko.utils.toggleDomNodeCssClass(element, value, true);
        }
    }
};
ko.bindingHandlers['enable'] = {
    'update': function (element, valueAccessor) {
        var value = ko.utils.unwrapObservable(valueAccessor());
        if (value && element.disabled)
            element.removeAttribute("disabled");
        else if ((!value) && (!element.disabled))
            element.disabled = true;
    }
};

ko.bindingHandlers['disable'] = {
    'update': function (element, valueAccessor) {
        ko.bindingHandlers['enable']['update'](element, function() { return !ko.utils.unwrapObservable(valueAccessor()) });
    }
};
// For certain common events (currently just 'click'), allow a simplified data-binding syntax
// e.g. click:handler instead of the usual full-length event:{click:handler}
function makeEventHandlerShortcut(eventName) {
    ko.bindingHandlers[eventName] = {
        'init': function(element, valueAccessor, allBindingsAccessor, viewModel) {
            var newValueAccessor = function () {
                var result = {};
                result[eventName] = valueAccessor();
                return result;
            };
            return ko.bindingHandlers['event']['init'].call(this, element, newValueAccessor, allBindingsAccessor, viewModel);
        }
    }
}

ko.bindingHandlers['event'] = {
    'init' : function (element, valueAccessor, allBindingsAccessor, viewModel) {
        var eventsToHandle = valueAccessor() || {};
        for(var eventNameOutsideClosure in eventsToHandle) {
            (function() {
                var eventName = eventNameOutsideClosure; // Separate variable to be captured by event handler closure
                if (typeof eventName == "string") {
                    ko.utils.registerEventHandler(element, eventName, function (event) {
                        var handlerReturnValue;
                        var handlerFunction = valueAccessor()[eventName];
                        if (!handlerFunction)
                            return;
                        var allBindings = allBindingsAccessor();

                        try {
                            // Take all the event args, and prefix with the viewmodel
                            var argsForHandler = ko.utils.makeArray(arguments);
                            argsForHandler.unshift(viewModel);
                            handlerReturnValue = handlerFunction.apply(viewModel, argsForHandler);
                        } finally {
                            if (handlerReturnValue !== true) { // Normally we want to prevent default action. Developer can override this be explicitly returning true.
                                if (event.preventDefault)
                                    event.preventDefault();
                                else
                                    event.returnValue = false;
                            }
                        }

                        var bubble = allBindings[eventName + 'Bubble'] !== false;
                        if (!bubble) {
                            event.cancelBubble = true;
                            if (event.stopPropagation)
                                event.stopPropagation();
                        }
                    });
                }
            })();
        }
    }
};
// "foreach: someExpression" is equivalent to "template: { foreach: someExpression }"
// "foreach: { data: someExpression, afterAdd: myfn }" is equivalent to "template: { foreach: someExpression, afterAdd: myfn }"
ko.bindingHandlers['foreach'] = {
    makeTemplateValueAccessor: function(valueAccessor) {
        return function() {
            var modelValue = valueAccessor(),
                unwrappedValue = ko.utils.peekObservable(modelValue);    // Unwrap without setting a dependency here

            // If unwrappedValue is the array, pass in the wrapped value on its own
            // The value will be unwrapped and tracked within the template binding
            // (See https://github.com/SteveSanderson/knockout/issues/523)
            if ((!unwrappedValue) || typeof unwrappedValue.length == "number")
                return { 'foreach': modelValue, 'templateEngine': ko.nativeTemplateEngine.instance };

            // If unwrappedValue.data is the array, preserve all relevant options and unwrap again value so we get updates
            ko.utils.unwrapObservable(modelValue);
            return {
                'foreach': unwrappedValue['data'],
                'as': unwrappedValue['as'],
                'includeDestroyed': unwrappedValue['includeDestroyed'],
                'afterAdd': unwrappedValue['afterAdd'],
                'beforeRemove': unwrappedValue['beforeRemove'],
                'afterRender': unwrappedValue['afterRender'],
                'beforeMove': unwrappedValue['beforeMove'],
                'afterMove': unwrappedValue['afterMove'],
                'templateEngine': ko.nativeTemplateEngine.instance
            };
        };
    },
    'init': function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        return ko.bindingHandlers['template']['init'](element, ko.bindingHandlers['foreach'].makeTemplateValueAccessor(valueAccessor));
    },
    'update': function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        return ko.bindingHandlers['template']['update'](element, ko.bindingHandlers['foreach'].makeTemplateValueAccessor(valueAccessor), allBindingsAccessor, viewModel, bindingContext);
    }
};
ko.expressionRewriting.bindingRewriteValidators['foreach'] = false; // Can't rewrite control flow bindings
ko.virtualElements.allowedBindings['foreach'] = true;
var hasfocusUpdatingProperty = '__ko_hasfocusUpdating';
ko.bindingHandlers['hasfocus'] = {
    'init': function(element, valueAccessor, allBindingsAccessor) {
        var handleElementFocusChange = function(isFocused) {
            // Where possible, ignore which event was raised and determine focus state using activeElement,
            // as this avoids phantom focus/blur events raised when changing tabs in modern browsers.
            // However, not all KO-targeted browsers (Firefox 2) support activeElement. For those browsers,
            // prevent a loss of focus when changing tabs/windows by setting a flag that prevents hasfocus
            // from calling 'blur()' on the element when it loses focus.
            // Discussion at https://github.com/SteveSanderson/knockout/pull/352
            element[hasfocusUpdatingProperty] = true;
            var ownerDoc = element.ownerDocument;
            if ("activeElement" in ownerDoc) {
                isFocused = (ownerDoc.activeElement === element);
            }
            var modelValue = valueAccessor();
            ko.expressionRewriting.writeValueToProperty(modelValue, allBindingsAccessor, 'hasfocus', isFocused, true);
            element[hasfocusUpdatingProperty] = false;
        };
        var handleElementFocusIn = handleElementFocusChange.bind(null, true);
        var handleElementFocusOut = handleElementFocusChange.bind(null, false);

        ko.utils.registerEventHandler(element, "focus", handleElementFocusIn);
        ko.utils.registerEventHandler(element, "focusin", handleElementFocusIn); // For IE
        ko.utils.registerEventHandler(element, "blur",  handleElementFocusOut);
        ko.utils.registerEventHandler(element, "focusout",  handleElementFocusOut); // For IE
    },
    'update': function(element, valueAccessor) {
        var value = ko.utils.unwrapObservable(valueAccessor());
        if (!element[hasfocusUpdatingProperty]) {
            value ? element.focus() : element.blur();
            ko.dependencyDetection.ignore(ko.utils.triggerEvent, null, [element, value ? "focusin" : "focusout"]); // For IE, which doesn't reliably fire "focus" or "blur" events synchronously
        }
    }
};
ko.bindingHandlers['html'] = {
    'init': function() {
        // Prevent binding on the dynamically-injected HTML (as developers are unlikely to expect that, and it has security implications)
        return { 'controlsDescendantBindings': true };
    },
    'update': function (element, valueAccessor) {
        // setHtml will unwrap the value if needed
        ko.utils.setHtml(element, valueAccessor());
    }
};
var withIfDomDataKey = '__ko_withIfBindingData';
// Makes a binding like with or if
function makeWithIfBinding(bindingKey, isWith, isNot, makeContextCallback) {
    ko.bindingHandlers[bindingKey] = {
        'init': function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            ko.utils.domData.set(element, withIfDomDataKey, {});
            return { 'controlsDescendantBindings': true };
        },
        'update': function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            var withIfData = ko.utils.domData.get(element, withIfDomDataKey),
                dataValue = ko.utils.unwrapObservable(valueAccessor()),
                shouldDisplay = !isNot !== !dataValue, // equivalent to isNot ? !dataValue : !!dataValue
                isFirstRender = !withIfData.savedNodes,
                needsRefresh = isFirstRender || isWith || (shouldDisplay !== withIfData.didDisplayOnLastUpdate);

            if (needsRefresh) {
                if (isFirstRender) {
                    withIfData.savedNodes = ko.utils.cloneNodes(ko.virtualElements.childNodes(element), true /* shouldCleanNodes */);
                }

                if (shouldDisplay) {
                    if (!isFirstRender) {
                        ko.virtualElements.setDomNodeChildren(element, ko.utils.cloneNodes(withIfData.savedNodes));
                    }
                    ko.applyBindingsToDescendants(makeContextCallback ? makeContextCallback(bindingContext, dataValue) : bindingContext, element);
                } else {
                    ko.virtualElements.emptyNode(element);
                }

                withIfData.didDisplayOnLastUpdate = shouldDisplay;
            }
        }
    };
    ko.expressionRewriting.bindingRewriteValidators[bindingKey] = false; // Can't rewrite control flow bindings
    ko.virtualElements.allowedBindings[bindingKey] = true;
}

// Construct the actual binding handlers
makeWithIfBinding('if');
makeWithIfBinding('ifnot', false /* isWith */, true /* isNot */);
makeWithIfBinding('with', true /* isWith */, false /* isNot */,
    function(bindingContext, dataValue) {
        return bindingContext['createChildContext'](dataValue);
    }
);
function ensureDropdownSelectionIsConsistentWithModelValue(element, modelValue, preferModelValue) {
    if (preferModelValue) {
        if (modelValue !== ko.selectExtensions.readValue(element))
            ko.selectExtensions.writeValue(element, modelValue);
    }

    // No matter which direction we're syncing in, we want the end result to be equality between dropdown value and model value.
    // If they aren't equal, either we prefer the dropdown value, or the model value couldn't be represented, so either way,
    // change the model value to match the dropdown.
    if (modelValue !== ko.selectExtensions.readValue(element))
        ko.dependencyDetection.ignore(ko.utils.triggerEvent, null, [element, "change"]);
};

ko.bindingHandlers['options'] = {
    'update': function (element, valueAccessor, allBindingsAccessor) {
        if (ko.utils.tagNameLower(element) !== "select")
            throw new Error("options binding applies only to SELECT elements");

        var selectWasPreviouslyEmpty = element.length == 0;
        var previousSelectedValues = ko.utils.arrayMap(ko.utils.arrayFilter(element.childNodes, function (node) {
            return node.tagName && (ko.utils.tagNameLower(node) === "option") && node.selected;
        }), function (node) {
            return ko.selectExtensions.readValue(node) || node.innerText || node.textContent;
        });
        var previousScrollTop = element.scrollTop;

        var value = ko.utils.unwrapObservable(valueAccessor());
        var selectedValue = element.value;

        // Remove all existing <option>s.
        // Need to use .remove() rather than .removeChild() for <option>s otherwise IE behaves oddly (https://github.com/SteveSanderson/knockout/issues/134)
        while (element.length > 0) {
            ko.cleanNode(element.options[0]);
            element.remove(0);
        }

        if (value) {
            var allBindings = allBindingsAccessor(),
                includeDestroyed = allBindings['optionsIncludeDestroyed'];

            if (typeof value.length != "number")
                value = [value];
            if (allBindings['optionsCaption']) {
                var option = document.createElement("option");
                ko.utils.setHtml(option, allBindings['optionsCaption']);
                ko.selectExtensions.writeValue(option, undefined);
                element.appendChild(option);
            }

            for (var i = 0, j = value.length; i < j; i++) {
                // Skip destroyed items
                var arrayEntry = value[i];
                if (arrayEntry && arrayEntry['_destroy'] && !includeDestroyed)
                    continue;

                var option = document.createElement("option");

                function applyToObject(object, predicate, defaultValue) {
                    var predicateType = typeof predicate;
                    if (predicateType == "function")    // Given a function; run it against the data value
                        return predicate(object);
                    else if (predicateType == "string") // Given a string; treat it as a property name on the data value
                        return object[predicate];
                    else                                // Given no optionsText arg; use the data value itself
                        return defaultValue;
                }

                // Apply a value to the option element
                var optionValue = applyToObject(arrayEntry, allBindings['optionsValue'], arrayEntry);
                ko.selectExtensions.writeValue(option, ko.utils.unwrapObservable(optionValue));

                // Apply some text to the option element
                var optionText = applyToObject(arrayEntry, allBindings['optionsText'], optionValue);
                ko.utils.setTextContent(option, optionText);

                element.appendChild(option);
            }

            // IE6 doesn't like us to assign selection to OPTION nodes before they're added to the document.
            // That's why we first added them without selection. Now it's time to set the selection.
            var newOptions = element.getElementsByTagName("option");
            var countSelectionsRetained = 0;
            for (var i = 0, j = newOptions.length; i < j; i++) {
                if (ko.utils.arrayIndexOf(previousSelectedValues, ko.selectExtensions.readValue(newOptions[i])) >= 0) {
                    ko.utils.setOptionNodeSelectionState(newOptions[i], true);
                    countSelectionsRetained++;
                }
            }

            element.scrollTop = previousScrollTop;

            if (selectWasPreviouslyEmpty && ('value' in allBindings)) {
                // Ensure consistency between model value and selected option.
                // If the dropdown is being populated for the first time here (or was otherwise previously empty),
                // the dropdown selection state is meaningless, so we preserve the model value.
                ensureDropdownSelectionIsConsistentWithModelValue(element, ko.utils.peekObservable(allBindings['value']), /* preferModelValue */ true);
            }

            // Workaround for IE9 bug
            ko.utils.ensureSelectElementIsRenderedCorrectly(element);
        }
    }
};
ko.bindingHandlers['options'].optionValueDomDataKey = '__ko.optionValueDomData__';
ko.bindingHandlers['selectedOptions'] = {
    'init': function (element, valueAccessor, allBindingsAccessor) {
        ko.utils.registerEventHandler(element, "change", function () {
            var value = valueAccessor(), valueToWrite = [];
            ko.utils.arrayForEach(element.getElementsByTagName("option"), function(node) {
                if (node.selected)
                    valueToWrite.push(ko.selectExtensions.readValue(node));
            });
            ko.expressionRewriting.writeValueToProperty(value, allBindingsAccessor, 'value', valueToWrite);
        });
    },
    'update': function (element, valueAccessor) {
        if (ko.utils.tagNameLower(element) != "select")
            throw new Error("values binding applies only to SELECT elements");

        var newValue = ko.utils.unwrapObservable(valueAccessor());
        if (newValue && typeof newValue.length == "number") {
            ko.utils.arrayForEach(element.getElementsByTagName("option"), function(node) {
                var isSelected = ko.utils.arrayIndexOf(newValue, ko.selectExtensions.readValue(node)) >= 0;
                ko.utils.setOptionNodeSelectionState(node, isSelected);
            });
        }
    }
};
ko.bindingHandlers['style'] = {
    'update': function (element, valueAccessor) {
        var value = ko.utils.unwrapObservable(valueAccessor() || {});
        for (var styleName in value) {
            if (typeof styleName == "string") {
                var styleValue = ko.utils.unwrapObservable(value[styleName]);
                element.style[styleName] = styleValue || ""; // Empty string removes the value, whereas null/undefined have no effect
            }
        }
    }
};
ko.bindingHandlers['submit'] = {
    'init': function (element, valueAccessor, allBindingsAccessor, viewModel) {
        if (typeof valueAccessor() != "function")
            throw new Error("The value for a submit binding must be a function");
        ko.utils.registerEventHandler(element, "submit", function (event) {
            var handlerReturnValue;
            var value = valueAccessor();
            try { handlerReturnValue = value.call(viewModel, element); }
            finally {
                if (handlerReturnValue !== true) { // Normally we want to prevent default action. Developer can override this be explicitly returning true.
                    if (event.preventDefault)
                        event.preventDefault();
                    else
                        event.returnValue = false;
                }
            }
        });
    }
};
ko.bindingHandlers['text'] = {
    'update': function (element, valueAccessor) {
        ko.utils.setTextContent(element, valueAccessor());
    }
};
ko.virtualElements.allowedBindings['text'] = true;
ko.bindingHandlers['uniqueName'] = {
    'init': function (element, valueAccessor) {
        if (valueAccessor()) {
            var name = "ko_unique_" + (++ko.bindingHandlers['uniqueName'].currentIndex);
            ko.utils.setElementName(element, name);
        }
    }
};
ko.bindingHandlers['uniqueName'].currentIndex = 0;
ko.bindingHandlers['value'] = {
    'init': function (element, valueAccessor, allBindingsAccessor) {
        // Always catch "change" event; possibly other events too if asked
        var eventsToCatch = ["change"];
        var requestedEventsToCatch = allBindingsAccessor()["valueUpdate"];
        var propertyChangedFired = false;
        if (requestedEventsToCatch) {
            if (typeof requestedEventsToCatch == "string") // Allow both individual event names, and arrays of event names
                requestedEventsToCatch = [requestedEventsToCatch];
            ko.utils.arrayPushAll(eventsToCatch, requestedEventsToCatch);
            eventsToCatch = ko.utils.arrayGetDistinctValues(eventsToCatch);
        }

        var valueUpdateHandler = function() {
            propertyChangedFired = false;
            var modelValue = valueAccessor();
            var elementValue = ko.selectExtensions.readValue(element);
            ko.expressionRewriting.writeValueToProperty(modelValue, allBindingsAccessor, 'value', elementValue);
        }

        // Workaround for https://github.com/SteveSanderson/knockout/issues/122
        // IE doesn't fire "change" events on textboxes if the user selects a value from its autocomplete list
        var ieAutoCompleteHackNeeded = ko.utils.ieVersion && element.tagName.toLowerCase() == "input" && element.type == "text"
                                       && element.autocomplete != "off" && (!element.form || element.form.autocomplete != "off");
        if (ieAutoCompleteHackNeeded && ko.utils.arrayIndexOf(eventsToCatch, "propertychange") == -1) {
            ko.utils.registerEventHandler(element, "propertychange", function () { propertyChangedFired = true });
            ko.utils.registerEventHandler(element, "blur", function() {
                if (propertyChangedFired) {
                    valueUpdateHandler();
                }
            });
        }

        ko.utils.arrayForEach(eventsToCatch, function(eventName) {
            // The syntax "after<eventname>" means "run the handler asynchronously after the event"
            // This is useful, for example, to catch "keydown" events after the browser has updated the control
            // (otherwise, ko.selectExtensions.readValue(this) will receive the control's value *before* the key event)
            var handler = valueUpdateHandler;
            if (ko.utils.stringStartsWith(eventName, "after")) {
                handler = function() { setTimeout(valueUpdateHandler, 0) };
                eventName = eventName.substring("after".length);
            }
            ko.utils.registerEventHandler(element, eventName, handler);
        });
    },
    'update': function (element, valueAccessor) {
        var valueIsSelectOption = ko.utils.tagNameLower(element) === "select";
        var newValue = ko.utils.unwrapObservable(valueAccessor());
        var elementValue = ko.selectExtensions.readValue(element);
        var valueHasChanged = (newValue != elementValue);

        // JavaScript's 0 == "" behavious is unfortunate here as it prevents writing 0 to an empty text box (loose equality suggests the values are the same).
        // We don't want to do a strict equality comparison as that is more confusing for developers in certain cases, so we specifically special case 0 != "" here.
        if ((newValue === 0) && (elementValue !== 0) && (elementValue !== "0"))
            valueHasChanged = true;

        if (valueHasChanged) {
            var applyValueAction = function () { ko.selectExtensions.writeValue(element, newValue); };
            applyValueAction();

            // Workaround for IE6 bug: It won't reliably apply values to SELECT nodes during the same execution thread
            // right after you've changed the set of OPTION nodes on it. So for that node type, we'll schedule a second thread
            // to apply the value as well.
            var alsoApplyAsynchronously = valueIsSelectOption;
            if (alsoApplyAsynchronously)
                setTimeout(applyValueAction, 0);
        }

        // If you try to set a model value that can't be represented in an already-populated dropdown, reject that change,
        // because you're not allowed to have a model value that disagrees with a visible UI selection.
        if (valueIsSelectOption && (element.length > 0))
            ensureDropdownSelectionIsConsistentWithModelValue(element, newValue, /* preferModelValue */ false);
    }
};
ko.bindingHandlers['visible'] = {
    'update': function (element, valueAccessor) {
        var value = ko.utils.unwrapObservable(valueAccessor());
        var isCurrentlyVisible = !(element.style.display == "none");
        if (value && !isCurrentlyVisible)
            element.style.display = "";
        else if ((!value) && isCurrentlyVisible)
            element.style.display = "none";
    }
};
// 'click' is just a shorthand for the usual full-length event:{click:handler}
makeEventHandlerShortcut('click');
// If you want to make a custom template engine,
//
// [1] Inherit from this class (like ko.nativeTemplateEngine does)
// [2] Override 'renderTemplateSource', supplying a function with this signature:
//
//        function (templateSource, bindingContext, options) {
//            // - templateSource.text() is the text of the template you should render
//            // - bindingContext.$data is the data you should pass into the template
//            //   - you might also want to make bindingContext.$parent, bindingContext.$parents,
//            //     and bindingContext.$root available in the template too
//            // - options gives you access to any other properties set on "data-bind: { template: options }"
//            //
//            // Return value: an array of DOM nodes
//        }
//
// [3] Override 'createJavaScriptEvaluatorBlock', supplying a function with this signature:
//
//        function (script) {
//            // Return value: Whatever syntax means "Evaluate the JavaScript statement 'script' and output the result"
//            //               For example, the jquery.tmpl template engine converts 'someScript' to '${ someScript }'
//        }
//
//     This is only necessary if you want to allow data-bind attributes to reference arbitrary template variables.
//     If you don't want to allow that, you can set the property 'allowTemplateRewriting' to false (like ko.nativeTemplateEngine does)
//     and then you don't need to override 'createJavaScriptEvaluatorBlock'.

ko.templateEngine = function () { };

ko.templateEngine.prototype['renderTemplateSource'] = function (templateSource, bindingContext, options) {
    throw new Error("Override renderTemplateSource");
};

ko.templateEngine.prototype['createJavaScriptEvaluatorBlock'] = function (script) {
    throw new Error("Override createJavaScriptEvaluatorBlock");
};

ko.templateEngine.prototype['makeTemplateSource'] = function(template, templateDocument) {
    // Named template
    if (typeof template == "string") {
        templateDocument = templateDocument || document;
        var elem = templateDocument.getElementById(template);
        if (!elem)
            throw new Error("Cannot find template with ID " + template);
        return new ko.templateSources.domElement(elem);
    } else if ((template.nodeType == 1) || (template.nodeType == 8)) {
        // Anonymous template
        return new ko.templateSources.anonymousTemplate(template);
    } else
        throw new Error("Unknown template type: " + template);
};

ko.templateEngine.prototype['renderTemplate'] = function (template, bindingContext, options, templateDocument) {
    var templateSource = this['makeTemplateSource'](template, templateDocument);
    return this['renderTemplateSource'](templateSource, bindingContext, options);
};

ko.templateEngine.prototype['isTemplateRewritten'] = function (template, templateDocument) {
    // Skip rewriting if requested
    if (this['allowTemplateRewriting'] === false)
        return true;
    return this['makeTemplateSource'](template, templateDocument)['data']("isRewritten");
};

ko.templateEngine.prototype['rewriteTemplate'] = function (template, rewriterCallback, templateDocument) {
    var templateSource = this['makeTemplateSource'](template, templateDocument);
    var rewritten = rewriterCallback(templateSource['text']());
    templateSource['text'](rewritten);
    templateSource['data']("isRewritten", true);
};

ko.exportSymbol('templateEngine', ko.templateEngine);

ko.templateRewriting = (function () {
    var memoizeDataBindingAttributeSyntaxRegex = /(<[a-z]+\d*(\s+(?!data-bind=)[a-z0-9\-]+(=(\"[^\"]*\"|\'[^\']*\'))?)*\s+)data-bind=(["'])([\s\S]*?)\5/gi;
    var memoizeVirtualContainerBindingSyntaxRegex = /<!--\s*ko\b\s*([\s\S]*?)\s*-->/g;

    function validateDataBindValuesForRewriting(keyValueArray) {
        var allValidators = ko.expressionRewriting.bindingRewriteValidators;
        for (var i = 0; i < keyValueArray.length; i++) {
            var key = keyValueArray[i]['key'];
            if (allValidators.hasOwnProperty(key)) {
                var validator = allValidators[key];

                if (typeof validator === "function") {
                    var possibleErrorMessage = validator(keyValueArray[i]['value']);
                    if (possibleErrorMessage)
                        throw new Error(possibleErrorMessage);
                } else if (!validator) {
                    throw new Error("This template engine does not support the '" + key + "' binding within its templates");
                }
            }
        }
    }

    function constructMemoizedTagReplacement(dataBindAttributeValue, tagToRetain, templateEngine) {
        var dataBindKeyValueArray = ko.expressionRewriting.parseObjectLiteral(dataBindAttributeValue);
        validateDataBindValuesForRewriting(dataBindKeyValueArray);
        var rewrittenDataBindAttributeValue = ko.expressionRewriting.preProcessBindings(dataBindKeyValueArray);

        // For no obvious reason, Opera fails to evaluate rewrittenDataBindAttributeValue unless it's wrapped in an additional
        // anonymous function, even though Opera's built-in debugger can evaluate it anyway. No other browser requires this
        // extra indirection.
        var applyBindingsToNextSiblingScript =
            "ko.__tr_ambtns(function($context,$element){return(function(){return{ " + rewrittenDataBindAttributeValue + " } })()})";
        return templateEngine['createJavaScriptEvaluatorBlock'](applyBindingsToNextSiblingScript) + tagToRetain;
    }

    return {
        ensureTemplateIsRewritten: function (template, templateEngine, templateDocument) {
            if (!templateEngine['isTemplateRewritten'](template, templateDocument))
                templateEngine['rewriteTemplate'](template, function (htmlString) {
                    return ko.templateRewriting.memoizeBindingAttributeSyntax(htmlString, templateEngine);
                }, templateDocument);
        },

        memoizeBindingAttributeSyntax: function (htmlString, templateEngine) {
            return htmlString.replace(memoizeDataBindingAttributeSyntaxRegex, function () {
                return constructMemoizedTagReplacement(/* dataBindAttributeValue: */ arguments[6], /* tagToRetain: */ arguments[1], templateEngine);
            }).replace(memoizeVirtualContainerBindingSyntaxRegex, function() {
                return constructMemoizedTagReplacement(/* dataBindAttributeValue: */ arguments[1], /* tagToRetain: */ "<!-- ko -->", templateEngine);
            });
        },

        applyMemoizedBindingsToNextSibling: function (bindings) {
            return ko.memoization.memoize(function (domNode, bindingContext) {
                if (domNode.nextSibling)
                    ko.applyBindingsToNode(domNode.nextSibling, bindings, bindingContext);
            });
        }
    }
})();


// Exported only because it has to be referenced by string lookup from within rewritten template
ko.exportSymbol('__tr_ambtns', ko.templateRewriting.applyMemoizedBindingsToNextSibling);
(function() {
    // A template source represents a read/write way of accessing a template. This is to eliminate the need for template loading/saving
    // logic to be duplicated in every template engine (and means they can all work with anonymous templates, etc.)
    //
    // Two are provided by default:
    //  1. ko.templateSources.domElement       - reads/writes the text content of an arbitrary DOM element
    //  2. ko.templateSources.anonymousElement - uses ko.utils.domData to read/write text *associated* with the DOM element, but
    //                                           without reading/writing the actual element text content, since it will be overwritten
    //                                           with the rendered template output.
    // You can implement your own template source if you want to fetch/store templates somewhere other than in DOM elements.
    // Template sources need to have the following functions:
    //   text() 			- returns the template text from your storage location
    //   text(value)		- writes the supplied template text to your storage location
    //   data(key)			- reads values stored using data(key, value) - see below
    //   data(key, value)	- associates "value" with this template and the key "key". Is used to store information like "isRewritten".
    //
    // Optionally, template sources can also have the following functions:
    //   nodes()            - returns a DOM element containing the nodes of this template, where available
    //   nodes(value)       - writes the given DOM element to your storage location
    // If a DOM element is available for a given template source, template engines are encouraged to use it in preference over text()
    // for improved speed. However, all templateSources must supply text() even if they don't supply nodes().
    //
    // Once you've implemented a templateSource, make your template engine use it by subclassing whatever template engine you were
    // using and overriding "makeTemplateSource" to return an instance of your custom template source.

    ko.templateSources = {};

    // ---- ko.templateSources.domElement -----

    ko.templateSources.domElement = function(element) {
        this.domElement = element;
    }

    ko.templateSources.domElement.prototype['text'] = function(/* valueToWrite */) {
        var tagNameLower = ko.utils.tagNameLower(this.domElement),
            elemContentsProperty = tagNameLower === "script" ? "text"
                                 : tagNameLower === "textarea" ? "value"
                                 : "innerHTML";

        if (arguments.length == 0) {
            return this.domElement[elemContentsProperty];
        } else {
            var valueToWrite = arguments[0];
            if (elemContentsProperty === "innerHTML")
                ko.utils.setHtml(this.domElement, valueToWrite);
            else
                this.domElement[elemContentsProperty] = valueToWrite;
        }
    };

    ko.templateSources.domElement.prototype['data'] = function(key /*, valueToWrite */) {
        if (arguments.length === 1) {
            return ko.utils.domData.get(this.domElement, "templateSourceData_" + key);
        } else {
            ko.utils.domData.set(this.domElement, "templateSourceData_" + key, arguments[1]);
        }
    };

    // ---- ko.templateSources.anonymousTemplate -----
    // Anonymous templates are normally saved/retrieved as DOM nodes through "nodes".
    // For compatibility, you can also read "text"; it will be serialized from the nodes on demand.
    // Writing to "text" is still supported, but then the template data will not be available as DOM nodes.

    var anonymousTemplatesDomDataKey = "__ko_anon_template__";
    ko.templateSources.anonymousTemplate = function(element) {
        this.domElement = element;
    }
    ko.templateSources.anonymousTemplate.prototype = new ko.templateSources.domElement();
    ko.templateSources.anonymousTemplate.prototype['text'] = function(/* valueToWrite */) {
        if (arguments.length == 0) {
            var templateData = ko.utils.domData.get(this.domElement, anonymousTemplatesDomDataKey) || {};
            if (templateData.textData === undefined && templateData.containerData)
                templateData.textData = templateData.containerData.innerHTML;
            return templateData.textData;
        } else {
            var valueToWrite = arguments[0];
            ko.utils.domData.set(this.domElement, anonymousTemplatesDomDataKey, {textData: valueToWrite});
        }
    };
    ko.templateSources.domElement.prototype['nodes'] = function(/* valueToWrite */) {
        if (arguments.length == 0) {
            var templateData = ko.utils.domData.get(this.domElement, anonymousTemplatesDomDataKey) || {};
            return templateData.containerData;
        } else {
            var valueToWrite = arguments[0];
            ko.utils.domData.set(this.domElement, anonymousTemplatesDomDataKey, {containerData: valueToWrite});
        }
    };

    ko.exportSymbol('templateSources', ko.templateSources);
    ko.exportSymbol('templateSources.domElement', ko.templateSources.domElement);
    ko.exportSymbol('templateSources.anonymousTemplate', ko.templateSources.anonymousTemplate);
})();
(function () {
    var _templateEngine;
    ko.setTemplateEngine = function (templateEngine) {
        if ((templateEngine != undefined) && !(templateEngine instanceof ko.templateEngine))
            throw new Error("templateEngine must inherit from ko.templateEngine");
        _templateEngine = templateEngine;
    }

    function invokeForEachNodeOrCommentInContinuousRange(firstNode, lastNode, action) {
        var node, nextInQueue = firstNode, firstOutOfRangeNode = ko.virtualElements.nextSibling(lastNode);
        while (nextInQueue && ((node = nextInQueue) !== firstOutOfRangeNode)) {
            nextInQueue = ko.virtualElements.nextSibling(node);
            if (node.nodeType === 1 || node.nodeType === 8)
                action(node);
        }
    }

    function activateBindingsOnContinuousNodeArray(continuousNodeArray, bindingContext) {
        // To be used on any nodes that have been rendered by a template and have been inserted into some parent element
        // Walks through continuousNodeArray (which *must* be continuous, i.e., an uninterrupted sequence of sibling nodes, because
        // the algorithm for walking them relies on this), and for each top-level item in the virtual-element sense,
        // (1) Does a regular "applyBindings" to associate bindingContext with this node and to activate any non-memoized bindings
        // (2) Unmemoizes any memos in the DOM subtree (e.g., to activate bindings that had been memoized during template rewriting)

        if (continuousNodeArray.length) {
            var firstNode = continuousNodeArray[0], lastNode = continuousNodeArray[continuousNodeArray.length - 1];

            // Need to applyBindings *before* unmemoziation, because unmemoization might introduce extra nodes (that we don't want to re-bind)
            // whereas a regular applyBindings won't introduce new memoized nodes
            invokeForEachNodeOrCommentInContinuousRange(firstNode, lastNode, function(node) {
                ko.applyBindings(bindingContext, node);
            });
            invokeForEachNodeOrCommentInContinuousRange(firstNode, lastNode, function(node) {
                ko.memoization.unmemoizeDomNodeAndDescendants(node, [bindingContext]);
            });
        }
    }

    function getFirstNodeFromPossibleArray(nodeOrNodeArray) {
        return nodeOrNodeArray.nodeType ? nodeOrNodeArray
                                        : nodeOrNodeArray.length > 0 ? nodeOrNodeArray[0]
                                        : null;
    }

    function executeTemplate(targetNodeOrNodeArray, renderMode, template, bindingContext, options) {
        options = options || {};
        var firstTargetNode = targetNodeOrNodeArray && getFirstNodeFromPossibleArray(targetNodeOrNodeArray);
        var templateDocument = firstTargetNode && firstTargetNode.ownerDocument;
        var templateEngineToUse = (options['templateEngine'] || _templateEngine);
        ko.templateRewriting.ensureTemplateIsRewritten(template, templateEngineToUse, templateDocument);
        var renderedNodesArray = templateEngineToUse['renderTemplate'](template, bindingContext, options, templateDocument);

        // Loosely check result is an array of DOM nodes
        if ((typeof renderedNodesArray.length != "number") || (renderedNodesArray.length > 0 && typeof renderedNodesArray[0].nodeType != "number"))
            throw new Error("Template engine must return an array of DOM nodes");

        var haveAddedNodesToParent = false;
        switch (renderMode) {
            case "replaceChildren":
                ko.virtualElements.setDomNodeChildren(targetNodeOrNodeArray, renderedNodesArray);
                haveAddedNodesToParent = true;
                break;
            case "replaceNode":
                ko.utils.replaceDomNodes(targetNodeOrNodeArray, renderedNodesArray);
                haveAddedNodesToParent = true;
                break;
            case "ignoreTargetNode": break;
            default:
                throw new Error("Unknown renderMode: " + renderMode);
        }

        if (haveAddedNodesToParent) {
            activateBindingsOnContinuousNodeArray(renderedNodesArray, bindingContext);
            if (options['afterRender'])
                ko.dependencyDetection.ignore(options['afterRender'], null, [renderedNodesArray, bindingContext['$data']]);
        }

        return renderedNodesArray;
    }

    ko.renderTemplate = function (template, dataOrBindingContext, options, targetNodeOrNodeArray, renderMode) {
        options = options || {};
        if ((options['templateEngine'] || _templateEngine) == undefined)
            throw new Error("Set a template engine before calling renderTemplate");
        renderMode = renderMode || "replaceChildren";

        if (targetNodeOrNodeArray) {
            var firstTargetNode = getFirstNodeFromPossibleArray(targetNodeOrNodeArray);

            var whenToDispose = function () { return (!firstTargetNode) || !ko.utils.domNodeIsAttachedToDocument(firstTargetNode); }; // Passive disposal (on next evaluation)
            var activelyDisposeWhenNodeIsRemoved = (firstTargetNode && renderMode == "replaceNode") ? firstTargetNode.parentNode : firstTargetNode;

            return ko.dependentObservable( // So the DOM is automatically updated when any dependency changes
                function () {
                    // Ensure we've got a proper binding context to work with
                    var bindingContext = (dataOrBindingContext && (dataOrBindingContext instanceof ko.bindingContext))
                        ? dataOrBindingContext
                        : new ko.bindingContext(ko.utils.unwrapObservable(dataOrBindingContext));

                    // Support selecting template as a function of the data being rendered
                    var templateName = typeof(template) == 'function' ? template(bindingContext['$data'], bindingContext) : template;

                    var renderedNodesArray = executeTemplate(targetNodeOrNodeArray, renderMode, templateName, bindingContext, options);
                    if (renderMode == "replaceNode") {
                        targetNodeOrNodeArray = renderedNodesArray;
                        firstTargetNode = getFirstNodeFromPossibleArray(targetNodeOrNodeArray);
                    }
                },
                null,
                { disposeWhen: whenToDispose, disposeWhenNodeIsRemoved: activelyDisposeWhenNodeIsRemoved }
            );
        } else {
            // We don't yet have a DOM node to evaluate, so use a memo and render the template later when there is a DOM node
            return ko.memoization.memoize(function (domNode) {
                ko.renderTemplate(template, dataOrBindingContext, options, domNode, "replaceNode");
            });
        }
    };

    ko.renderTemplateForEach = function (template, arrayOrObservableArray, options, targetNode, parentBindingContext) {
        // Since setDomNodeChildrenFromArrayMapping always calls executeTemplateForArrayItem and then
        // activateBindingsCallback for added items, we can store the binding context in the former to use in the latter.
        var arrayItemContext;

        // This will be called by setDomNodeChildrenFromArrayMapping to get the nodes to add to targetNode
        var executeTemplateForArrayItem = function (arrayValue, index) {
            // Support selecting template as a function of the data being rendered
            arrayItemContext = parentBindingContext['createChildContext'](ko.utils.unwrapObservable(arrayValue), options['as']);
            arrayItemContext['$index'] = index;
            var templateName = typeof(template) == 'function' ? template(arrayValue, arrayItemContext) : template;
            return executeTemplate(null, "ignoreTargetNode", templateName, arrayItemContext, options);
        }

        // This will be called whenever setDomNodeChildrenFromArrayMapping has added nodes to targetNode
        var activateBindingsCallback = function(arrayValue, addedNodesArray, index) {
            activateBindingsOnContinuousNodeArray(addedNodesArray, arrayItemContext);
            if (options['afterRender'])
                options['afterRender'](addedNodesArray, arrayValue);
        };

        return ko.dependentObservable(function () {
            var unwrappedArray = ko.utils.unwrapObservable(arrayOrObservableArray) || [];
            if (typeof unwrappedArray.length == "undefined") // Coerce single value into array
                unwrappedArray = [unwrappedArray];

            // Filter out any entries marked as destroyed
            var filteredArray = ko.utils.arrayFilter(unwrappedArray, function(item) {
                return options['includeDestroyed'] || item === undefined || item === null || !ko.utils.unwrapObservable(item['_destroy']);
            });

            // Call setDomNodeChildrenFromArrayMapping, ignoring any observables unwrapped within (most likely from a callback function).
            // If the array items are observables, though, they will be unwrapped in executeTemplateForArrayItem and managed within setDomNodeChildrenFromArrayMapping.
            ko.dependencyDetection.ignore(ko.utils.setDomNodeChildrenFromArrayMapping, null, [targetNode, filteredArray, executeTemplateForArrayItem, options, activateBindingsCallback]);

        }, null, { disposeWhenNodeIsRemoved: targetNode });
    };

    var templateComputedDomDataKey = '__ko__templateComputedDomDataKey__';
    function disposeOldComputedAndStoreNewOne(element, newComputed) {
        var oldComputed = ko.utils.domData.get(element, templateComputedDomDataKey);
        if (oldComputed && (typeof(oldComputed.dispose) == 'function'))
            oldComputed.dispose();
        ko.utils.domData.set(element, templateComputedDomDataKey, (newComputed && newComputed.isActive()) ? newComputed : undefined);
    }

    ko.bindingHandlers['template'] = {
        'init': function(element, valueAccessor) {
            // Support anonymous templates
            var bindingValue = ko.utils.unwrapObservable(valueAccessor());
            if ((typeof bindingValue != "string") && (!bindingValue['name']) && (element.nodeType == 1 || element.nodeType == 8)) {
                // It's an anonymous template - store the element contents, then clear the element
                var templateNodes = element.nodeType == 1 ? element.childNodes : ko.virtualElements.childNodes(element),
                    container = ko.utils.moveCleanedNodesToContainerElement(templateNodes); // This also removes the nodes from their current parent
                new ko.templateSources.anonymousTemplate(element)['nodes'](container);
            }
            return { 'controlsDescendantBindings': true };
        },
        'update': function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            var templateName = ko.utils.unwrapObservable(valueAccessor()),
                options = {},
                shouldDisplay = true,
                dataValue,
                templateComputed = null;

            if (typeof templateName != "string") {
                options = templateName;
                templateName = options['name'];

                // Support "if"/"ifnot" conditions
                if ('if' in options)
                    shouldDisplay = ko.utils.unwrapObservable(options['if']);
                if (shouldDisplay && 'ifnot' in options)
                    shouldDisplay = !ko.utils.unwrapObservable(options['ifnot']);

                dataValue = ko.utils.unwrapObservable(options['data']);
            }

            if ('foreach' in options) {
                // Render once for each data point (treating data set as empty if shouldDisplay==false)
                var dataArray = (shouldDisplay && options['foreach']) || [];
                templateComputed = ko.renderTemplateForEach(templateName || element, dataArray, options, element, bindingContext);
            } else if (!shouldDisplay) {
                ko.virtualElements.emptyNode(element);
            } else {
                // Render once for this single data point (or use the viewModel if no data was provided)
                var innerBindingContext = ('data' in options) ?
                    bindingContext['createChildContext'](dataValue, options['as']) :  // Given an explitit 'data' value, we create a child binding context for it
                    bindingContext;                                                        // Given no explicit 'data' value, we retain the same binding context
                templateComputed = ko.renderTemplate(templateName || element, innerBindingContext, options, element);
            }

            // It only makes sense to have a single template computed per element (otherwise which one should have its output displayed?)
            disposeOldComputedAndStoreNewOne(element, templateComputed);
        }
    };

    // Anonymous templates can't be rewritten. Give a nice error message if you try to do it.
    ko.expressionRewriting.bindingRewriteValidators['template'] = function(bindingValue) {
        var parsedBindingValue = ko.expressionRewriting.parseObjectLiteral(bindingValue);

        if ((parsedBindingValue.length == 1) && parsedBindingValue[0]['unknown'])
            return null; // It looks like a string literal, not an object literal, so treat it as a named template (which is allowed for rewriting)

        if (ko.expressionRewriting.keyValueArrayContainsKey(parsedBindingValue, "name"))
            return null; // Named templates can be rewritten, so return "no error"
        return "This template engine does not support anonymous templates nested within its templates";
    };

    ko.virtualElements.allowedBindings['template'] = true;
})();

ko.exportSymbol('setTemplateEngine', ko.setTemplateEngine);
ko.exportSymbol('renderTemplate', ko.renderTemplate);

ko.utils.compareArrays = (function () {
    var statusNotInOld = 'added', statusNotInNew = 'deleted';

    // Simple calculation based on Levenshtein distance.
    function compareArrays(oldArray, newArray, dontLimitMoves) {
        oldArray = oldArray || [];
        newArray = newArray || [];

        if (oldArray.length <= newArray.length)
            return compareSmallArrayToBigArray(oldArray, newArray, statusNotInOld, statusNotInNew, dontLimitMoves);
        else
            return compareSmallArrayToBigArray(newArray, oldArray, statusNotInNew, statusNotInOld, dontLimitMoves);
    }

    function compareSmallArrayToBigArray(smlArray, bigArray, statusNotInSml, statusNotInBig, dontLimitMoves) {
        var myMin = Math.min,
            myMax = Math.max,
            editDistanceMatrix = [],
            smlIndex, smlIndexMax = smlArray.length,
            bigIndex, bigIndexMax = bigArray.length,
            compareRange = (bigIndexMax - smlIndexMax) || 1,
            maxDistance = smlIndexMax + bigIndexMax + 1,
            thisRow, lastRow,
            bigIndexMaxForRow, bigIndexMinForRow;

        for (smlIndex = 0; smlIndex <= smlIndexMax; smlIndex++) {
            lastRow = thisRow;
            editDistanceMatrix.push(thisRow = []);
            bigIndexMaxForRow = myMin(bigIndexMax, smlIndex + compareRange);
            bigIndexMinForRow = myMax(0, smlIndex - 1);
            for (bigIndex = bigIndexMinForRow; bigIndex <= bigIndexMaxForRow; bigIndex++) {
                if (!bigIndex)
                    thisRow[bigIndex] = smlIndex + 1;
                else if (!smlIndex)  // Top row - transform empty array into new array via additions
                    thisRow[bigIndex] = bigIndex + 1;
                else if (smlArray[smlIndex - 1] === bigArray[bigIndex - 1])
                    thisRow[bigIndex] = lastRow[bigIndex - 1];                  // copy value (no edit)
                else {
                    var northDistance = lastRow[bigIndex] || maxDistance;       // not in big (deletion)
                    var westDistance = thisRow[bigIndex - 1] || maxDistance;    // not in small (addition)
                    thisRow[bigIndex] = myMin(northDistance, westDistance) + 1;
                }
            }
        }

        var editScript = [], meMinusOne, notInSml = [], notInBig = [];
        for (smlIndex = smlIndexMax, bigIndex = bigIndexMax; smlIndex || bigIndex;) {
            meMinusOne = editDistanceMatrix[smlIndex][bigIndex] - 1;
            if (bigIndex && meMinusOne === editDistanceMatrix[smlIndex][bigIndex-1]) {
                notInSml.push(editScript[editScript.length] = {     // added
                    'status': statusNotInSml,
                    'value': bigArray[--bigIndex],
                    'index': bigIndex });
            } else if (smlIndex && meMinusOne === editDistanceMatrix[smlIndex - 1][bigIndex]) {
                notInBig.push(editScript[editScript.length] = {     // deleted
                    'status': statusNotInBig,
                    'value': smlArray[--smlIndex],
                    'index': smlIndex });
            } else {
                editScript.push({
                    'status': "retained",
                    'value': bigArray[--bigIndex] });
                --smlIndex;
            }
        }

        if (notInSml.length && notInBig.length) {
            // Set a limit on the number of consecutive non-matching comparisons; having it a multiple of
            // smlIndexMax keeps the time complexity of this algorithm linear.
            var limitFailedCompares = smlIndexMax * 10, failedCompares,
                a, d, notInSmlItem, notInBigItem;
            // Go through the items that have been added and deleted and try to find matches between them.
            for (failedCompares = a = 0; (dontLimitMoves || failedCompares < limitFailedCompares) && (notInSmlItem = notInSml[a]); a++) {
                for (d = 0; notInBigItem = notInBig[d]; d++) {
                    if (notInSmlItem['value'] === notInBigItem['value']) {
                        notInSmlItem['moved'] = notInBigItem['index'];
                        notInBigItem['moved'] = notInSmlItem['index'];
                        notInBig.splice(d,1);       // This item is marked as moved; so remove it from notInBig list
                        failedCompares = d = 0;     // Reset failed compares count because we're checking for consecutive failures
                        break;
                    }
                }
                failedCompares += d;
            }
        }
        return editScript.reverse();
    }

    return compareArrays;
})();

ko.exportSymbol('utils.compareArrays', ko.utils.compareArrays);

(function () {
    // Objective:
    // * Given an input array, a container DOM node, and a function from array elements to arrays of DOM nodes,
    //   map the array elements to arrays of DOM nodes, concatenate together all these arrays, and use them to populate the container DOM node
    // * Next time we're given the same combination of things (with the array possibly having mutated), update the container DOM node
    //   so that its children is again the concatenation of the mappings of the array elements, but don't re-map any array elements that we
    //   previously mapped - retain those nodes, and just insert/delete other ones

    // "callbackAfterAddingNodes" will be invoked after any "mapping"-generated nodes are inserted into the container node
    // You can use this, for example, to activate bindings on those nodes.

    function fixUpNodesToBeMovedOrRemoved(contiguousNodeArray) {
        // Before moving, deleting, or replacing a set of nodes that were previously outputted by the "map" function, we have to reconcile
        // them against what is in the DOM right now. It may be that some of the nodes have already been removed from the document,
        // or that new nodes might have been inserted in the middle, for example by a binding. Also, there may previously have been
        // leading comment nodes (created by rewritten string-based templates) that have since been removed during binding.
        // So, this function translates the old "map" output array into its best guess of what set of current DOM nodes should be removed.
        //
        // Rules:
        //   [A] Any leading nodes that aren't in the document any more should be ignored
        //       These most likely correspond to memoization nodes that were already removed during binding
        //       See https://github.com/SteveSanderson/knockout/pull/440
        //   [B] We want to output a contiguous series of nodes that are still in the document. So, ignore any nodes that
        //       have already been removed, and include any nodes that have been inserted among the previous collection

        // Rule [A]
        while (contiguousNodeArray.length && !ko.utils.domNodeIsAttachedToDocument(contiguousNodeArray[0]))
            contiguousNodeArray.splice(0, 1);

        // Rule [B]
        if (contiguousNodeArray.length > 1) {
            // Build up the actual new contiguous node set
            var current = contiguousNodeArray[0], last = contiguousNodeArray[contiguousNodeArray.length - 1], newContiguousSet = [current];
            while (current !== last) {
                current = current.nextSibling;
                if (!current) // Won't happen, except if the developer has manually removed some DOM elements (then we're in an undefined scenario)
                    return;
                newContiguousSet.push(current);
            }

            // ... then mutate the input array to match this.
            // (The following line replaces the contents of contiguousNodeArray with newContiguousSet)
            Array.prototype.splice.apply(contiguousNodeArray, [0, contiguousNodeArray.length].concat(newContiguousSet));
        }
        return contiguousNodeArray;
    }

    function mapNodeAndRefreshWhenChanged(containerNode, mapping, valueToMap, callbackAfterAddingNodes, index) {
        // Map this array value inside a dependentObservable so we re-map when any dependency changes
        var mappedNodes = [];
        var dependentObservable = ko.dependentObservable(function() {
            var newMappedNodes = mapping(valueToMap, index) || [];

            // On subsequent evaluations, just replace the previously-inserted DOM nodes
            if (mappedNodes.length > 0) {
                ko.utils.replaceDomNodes(fixUpNodesToBeMovedOrRemoved(mappedNodes), newMappedNodes);
                if (callbackAfterAddingNodes)
                    ko.dependencyDetection.ignore(callbackAfterAddingNodes, null, [valueToMap, newMappedNodes, index]);
            }

            // Replace the contents of the mappedNodes array, thereby updating the record
            // of which nodes would be deleted if valueToMap was itself later removed
            mappedNodes.splice(0, mappedNodes.length);
            ko.utils.arrayPushAll(mappedNodes, newMappedNodes);
        }, null, { disposeWhenNodeIsRemoved: containerNode, disposeWhen: function() { return (mappedNodes.length == 0) || !ko.utils.domNodeIsAttachedToDocument(mappedNodes[0]) } });
        return { mappedNodes : mappedNodes, dependentObservable : (dependentObservable.isActive() ? dependentObservable : undefined) };
    }

    var lastMappingResultDomDataKey = "setDomNodeChildrenFromArrayMapping_lastMappingResult";

    ko.utils.setDomNodeChildrenFromArrayMapping = function (domNode, array, mapping, options, callbackAfterAddingNodes) {
        // Compare the provided array against the previous one
        array = array || [];
        options = options || {};
        var isFirstExecution = ko.utils.domData.get(domNode, lastMappingResultDomDataKey) === undefined;
        var lastMappingResult = ko.utils.domData.get(domNode, lastMappingResultDomDataKey) || [];
        var lastArray = ko.utils.arrayMap(lastMappingResult, function (x) { return x.arrayEntry; });
        var editScript = ko.utils.compareArrays(lastArray, array);

        // Build the new mapping result
        var newMappingResult = [];
        var lastMappingResultIndex = 0;
        var newMappingResultIndex = 0;

        var nodesToDelete = [];
        var itemsToProcess = [];
        var itemsForBeforeRemoveCallbacks = [];
        var itemsForMoveCallbacks = [];
        var itemsForAfterAddCallbacks = [];
        var mapData;

        function itemMovedOrRetained(editScriptIndex, oldPosition) {
            mapData = lastMappingResult[oldPosition];
            if (newMappingResultIndex !== oldPosition)
                itemsForMoveCallbacks[editScriptIndex] = mapData;
            // Since updating the index might change the nodes, do so before calling fixUpNodesToBeMovedOrRemoved
            mapData.indexObservable(newMappingResultIndex++);
            fixUpNodesToBeMovedOrRemoved(mapData.mappedNodes);
            newMappingResult.push(mapData);
            itemsToProcess.push(mapData);
        }

        function callCallback(callback, items) {
            if (callback) {
                for (var i = 0, n = items.length; i < n; i++) {
                    if (items[i]) {
                        ko.utils.arrayForEach(items[i].mappedNodes, function(node) {
                            callback(node, i, items[i].arrayEntry);
                        });
                    }
                }
            }
        }

        for (var i = 0, editScriptItem, movedIndex; editScriptItem = editScript[i]; i++) {
            movedIndex = editScriptItem['moved'];
            switch (editScriptItem['status']) {
                case "deleted":
                    if (movedIndex === undefined) {
                        mapData = lastMappingResult[lastMappingResultIndex];

                        // Stop tracking changes to the mapping for these nodes
                        if (mapData.dependentObservable)
                            mapData.dependentObservable.dispose();

                        // Queue these nodes for later removal
                        nodesToDelete.push.apply(nodesToDelete, fixUpNodesToBeMovedOrRemoved(mapData.mappedNodes));
                        if (options['beforeRemove']) {
                            itemsForBeforeRemoveCallbacks[i] = mapData;
                            itemsToProcess.push(mapData);
                        }
                    }
                    lastMappingResultIndex++;
                    break;

                case "retained":
                    itemMovedOrRetained(i, lastMappingResultIndex++);
                    break;

                case "added":
                    if (movedIndex !== undefined) {
                        itemMovedOrRetained(i, movedIndex);
                    } else {
                        mapData = { arrayEntry: editScriptItem['value'], indexObservable: ko.observable(newMappingResultIndex++) };
                        newMappingResult.push(mapData);
                        itemsToProcess.push(mapData);
                        if (!isFirstExecution)
                            itemsForAfterAddCallbacks[i] = mapData;
                    }
                    break;
            }
        }

        // Call beforeMove first before any changes have been made to the DOM
        callCallback(options['beforeMove'], itemsForMoveCallbacks);

        // Next remove nodes for deleted items (or just clean if there's a beforeRemove callback)
        ko.utils.arrayForEach(nodesToDelete, options['beforeRemove'] ? ko.cleanNode : ko.removeNode);

        // Next add/reorder the remaining items (will include deleted items if there's a beforeRemove callback)
        for (var i = 0, nextNode = ko.virtualElements.firstChild(domNode), lastNode, node; mapData = itemsToProcess[i]; i++) {
            // Get nodes for newly added items
            if (!mapData.mappedNodes)
                ko.utils.extend(mapData, mapNodeAndRefreshWhenChanged(domNode, mapping, mapData.arrayEntry, callbackAfterAddingNodes, mapData.indexObservable));

            // Put nodes in the right place if they aren't there already
            for (var j = 0; node = mapData.mappedNodes[j]; nextNode = node.nextSibling, lastNode = node, j++) {
                if (node !== nextNode)
                    ko.virtualElements.insertAfter(domNode, node, lastNode);
            }

            // Run the callbacks for newly added nodes (for example, to apply bindings, etc.)
            if (!mapData.initialized && callbackAfterAddingNodes) {
                callbackAfterAddingNodes(mapData.arrayEntry, mapData.mappedNodes, mapData.indexObservable);
                mapData.initialized = true;
            }
        }

        // If there's a beforeRemove callback, call it after reordering.
        // Note that we assume that the beforeRemove callback will usually be used to remove the nodes using
        // some sort of animation, which is why we first reorder the nodes that will be removed. If the
        // callback instead removes the nodes right away, it would be more efficient to skip reordering them.
        // Perhaps we'll make that change in the future if this scenario becomes more common.
        callCallback(options['beforeRemove'], itemsForBeforeRemoveCallbacks);

        // Finally call afterMove and afterAdd callbacks
        callCallback(options['afterMove'], itemsForMoveCallbacks);
        callCallback(options['afterAdd'], itemsForAfterAddCallbacks);

        // Store a copy of the array items we just considered so we can difference it next time
        ko.utils.domData.set(domNode, lastMappingResultDomDataKey, newMappingResult);
    }
})();

ko.exportSymbol('utils.setDomNodeChildrenFromArrayMapping', ko.utils.setDomNodeChildrenFromArrayMapping);
ko.nativeTemplateEngine = function () {
    this['allowTemplateRewriting'] = false;
}

ko.nativeTemplateEngine.prototype = new ko.templateEngine();
ko.nativeTemplateEngine.prototype['renderTemplateSource'] = function (templateSource, bindingContext, options) {
    var useNodesIfAvailable = !(ko.utils.ieVersion < 9), // IE<9 cloneNode doesn't work properly
        templateNodesFunc = useNodesIfAvailable ? templateSource['nodes'] : null,
        templateNodes = templateNodesFunc ? templateSource['nodes']() : null;

    if (templateNodes) {
        return ko.utils.makeArray(templateNodes.cloneNode(true).childNodes);
    } else {
        var templateText = templateSource['text']();
        return ko.utils.parseHtmlFragment(templateText);
    }
};

ko.nativeTemplateEngine.instance = new ko.nativeTemplateEngine();
ko.setTemplateEngine(ko.nativeTemplateEngine.instance);

ko.exportSymbol('nativeTemplateEngine', ko.nativeTemplateEngine);
(function() {
    ko.jqueryTmplTemplateEngine = function () {
        // Detect which version of jquery-tmpl you're using. Unfortunately jquery-tmpl
        // doesn't expose a version number, so we have to infer it.
        // Note that as of Knockout 1.3, we only support jQuery.tmpl 1.0.0pre and later,
        // which KO internally refers to as version "2", so older versions are no longer detected.
        var jQueryTmplVersion = this.jQueryTmplVersion = (function() {
            if ((typeof(jQuery) == "undefined") || !(jQuery['tmpl']))
                return 0;
            // Since it exposes no official version number, we use our own numbering system. To be updated as jquery-tmpl evolves.
            try {
                if (jQuery['tmpl']['tag']['tmpl']['open'].toString().indexOf('__') >= 0) {
                    // Since 1.0.0pre, custom tags should append markup to an array called "__"
                    return 2; // Final version of jquery.tmpl
                }
            } catch(ex) { /* Apparently not the version we were looking for */ }

            return 1; // Any older version that we don't support
        })();

        function ensureHasReferencedJQueryTemplates() {
            if (jQueryTmplVersion < 2)
                throw new Error("Your version of jQuery.tmpl is too old. Please upgrade to jQuery.tmpl 1.0.0pre or later.");
        }

        function executeTemplate(compiledTemplate, data, jQueryTemplateOptions) {
            return jQuery['tmpl'](compiledTemplate, data, jQueryTemplateOptions);
        }

        this['renderTemplateSource'] = function(templateSource, bindingContext, options) {
            options = options || {};
            ensureHasReferencedJQueryTemplates();

            // Ensure we have stored a precompiled version of this template (don't want to reparse on every render)
            var precompiled = templateSource['data']('precompiled');
            if (!precompiled) {
                var templateText = templateSource['text']() || "";
                // Wrap in "with($whatever.koBindingContext) { ... }"
                templateText = "{{ko_with $item.koBindingContext}}" + templateText + "{{/ko_with}}";

                precompiled = jQuery['template'](null, templateText);
                templateSource['data']('precompiled', precompiled);
            }

            var data = [bindingContext['$data']]; // Prewrap the data in an array to stop jquery.tmpl from trying to unwrap any arrays
            var jQueryTemplateOptions = jQuery['extend']({ 'koBindingContext': bindingContext }, options['templateOptions']);

            var resultNodes = executeTemplate(precompiled, data, jQueryTemplateOptions);
            resultNodes['appendTo'](document.createElement("div")); // Using "appendTo" forces jQuery/jQuery.tmpl to perform necessary cleanup work

            jQuery['fragments'] = {}; // Clear jQuery's fragment cache to avoid a memory leak after a large number of template renders
            return resultNodes;
        };

        this['createJavaScriptEvaluatorBlock'] = function(script) {
            return "{{ko_code ((function() { return " + script + " })()) }}";
        };

        this['addTemplate'] = function(templateName, templateMarkup) {
            document.write("<script type='text/html' id='" + templateName + "'>" + templateMarkup + "</script>");
        };

        if (jQueryTmplVersion > 0) {
            jQuery['tmpl']['tag']['ko_code'] = {
                open: "__.push($1 || '');"
            };
            jQuery['tmpl']['tag']['ko_with'] = {
                open: "with($1) {",
                close: "} "
            };
        }
    };

    ko.jqueryTmplTemplateEngine.prototype = new ko.templateEngine();

    // Use this one by default *only if jquery.tmpl is referenced*
    var jqueryTmplTemplateEngineInstance = new ko.jqueryTmplTemplateEngine();
    if (jqueryTmplTemplateEngineInstance.jQueryTmplVersion > 0)
        ko.setTemplateEngine(jqueryTmplTemplateEngineInstance);

    ko.exportSymbol('jqueryTmplTemplateEngine', ko.jqueryTmplTemplateEngine);
})();
});
})(window,document,navigator,window["jQuery"]);
})();

(function(/*! Stitch !*/) {
  if (!this.require) {
    var modules = {}, cache = {}, require = function(name, root) {
      var path = expand(root, name), module = cache[path], fn;
      if (module) {
        return module.exports;
      } else if (fn = modules[path] || modules[path = expand(path, './index')]) {
        module = {id: path, exports: {}};
        try {
          cache[path] = module;
          fn(module.exports, function(name) {
            return require(name, dirname(path));
          }, module);
          return module.exports;
        } catch (err) {
          delete cache[path];
          throw err;
        }
      } else {
        throw 'module \'' + name + '\' not found';
      }
    }, expand = function(root, name) {
      var results = [], parts, part;
      if (/^\.\.?(\/|$)/.test(name)) {
        parts = [root, name].join('/').split('/');
      } else {
        parts = name.split('/');
      }
      for (var i = 0, length = parts.length; i < length; i++) {
        part = parts[i];
        if (part == '..') {
          results.pop();
        } else if (part != '.' && part != '') {
          results.push(part);
        }
      }
      return results.join('/');
    }, dirname = function(path) {
      return path.split('/').slice(0, -1).join('/');
    };
    this.require = function(name) {
      return require(name, '');
    }
    this.require.define = function(bundle) {
      for (var key in bundle)
        modules[key] = bundle[key];
    };
  }
  return this.require.define;
}).call(this)({"lm": function(exports, require, module) {(function() {

  module.exports = require('./lm/root');

  require('./lm/subnet6');

}).call(this);
}, "lm/_base": function(exports, require, module) {(function() {

  module.exports = {};

}).call(this);
}, "lm/root": function(exports, require, module) {(function() {

  module.exports = require('./_base');

}).call(this);
}, "lm/subnet6": function(exports, require, module) {(function() {
  var lm, root, _ref, _ref1,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  lm = require('./root');

  root = typeof window !== "undefined" && window !== null ? window : exports;

  if ((_ref = root._) == null) {
    root._ = require('underscore');
  }

  if ((_ref1 = root.d3) == null) {
    root.d3 = require('d3');
  }

  if (typeof window === "undefined" || window === null) {
    this.IP = require('ipv6');
    root.v6 = this.IP.v6;
  }

  lm.Subnet6 = (function() {

    Subnet6.clear_cache = function() {
      this.subnets = {};
      return this._new_subnets = [];
    };

    Subnet6.find = function(xnid, format, callback) {
      var _ref2,
        _this = this;
      if ((_ref2 = this.subnets) == null) {
        this.subnets = {};
      }
      if (this.subnets[xnid]) {
        return callback(void 0, this.subnets[xnid]);
      } else {
        return Xn.xnid_with_format(xnid, format, function(err, subnet) {
          if (err) {
            return callback(err, subnet);
          } else {
            return callback(err, new Subnet6(subnet));
          }
        });
      }
    };

    Subnet6.register = function(s6) {
      var _ref2, _ref3;
      if ((_ref2 = this.subnets) == null) {
        this.subnets = {};
      }
      if (s6.is_new()) {
        if ((_ref3 = this._new_subnets) == null) {
          this._new_subnets = [];
        }
        this._new_subnets.push(s6);
      }
      return this.subnets[s6.xnid()] = s6;
    };

    Subnet6.created = function(old_xnid, s6) {
      this.subnets[old_xnid] = null;
      this.subnets[s6.xnid()] = s6;
      return this._new_subnets = _.select(this._new_subnets, function(s) {
        return s.is_new();
      });
    };

    Subnet6.uncreated = function(xnid) {
      this.subnets[xnid] = null;
      return this._new_subnets = _.reject(this._new_subnets, function(s) {
        return s.xnid() === xnid;
      });
    };

    Subnet6.new_subnets = function() {
      return this._new_subnets;
    };

    Subnet6.modified_subnets = function() {
      return _.select(this.subnets, function(s) {
        return s.is_modified();
      });
    };

    Subnet6.save_new_subnets = function() {
      var _ref2;
      return (_ref2 = this._new_subnets) != null ? _ref2 : this._new_subnets = [];
    };

    function Subnet6(subnet) {
      var _ref2;
      this.subnet = subnet;
      if (!this.subnet) {
        throw new Error("Subnet must be specified");
      }
      if ((_ref2 = BigInteger.LONG) == null) {
        BigInteger.LONG = new BigInteger('' + Math.pow(2, 32));
      }
      lm.Subnet6.register(this);
    }

    Subnet6.prototype.is_valid = function() {
      return this.network_address();
    };

    Subnet6.prototype.xnid = function() {
      return this.subnet.xnid();
    };

    Subnet6.prototype.name = function() {
      return this.subnet.attr('name');
    };

    Subnet6.prototype.direction = function() {
      return this.subnet.attr('direction');
    };

    Subnet6.prototype.zone = function() {
      var _ref2;
      return (_ref2 = this.zone_model()) != null ? _ref2.attr('name') : void 0;
    };

    Subnet6.prototype.is_new = function() {
      return this.subnet.is_new();
    };

    Subnet6.prototype.is_modified = function() {
      return !this.subnet.is_new() && this.subnet.is_modified();
    };

    Subnet6.prototype.network_address = function() {
      return this.subnet.attr('network_address');
    };

    Subnet6.prototype.vlans = function() {
      var vlan_nums, vlans, zone;
      zone = this.zone_model();
      if (zone) {
        vlans = zone.many_rel('vlans');
        vlan_nums = vlans.map(function(vlan) {
          return vlan.attr('number');
        });
        return vlan_nums.join(', ');
      }
    };

    Subnet6.prototype.zone_model = function() {
      return this.subnet.one_rel('zone');
    };

    Subnet6.prototype.base = function() {
      return this.network_address().split('/')[0];
    };

    Subnet6.prototype.mask = function() {
      return this.network_address().split('/')[1] * 1 + 96;
    };

    Subnet6.prototype.ipv6 = function() {
      var _ref2;
      return (_ref2 = this._ip) != null ? _ref2 : this._ip = new root.v6.Address('::ffff:' + this.base() + '/' + this.mask());
    };

    Subnet6.prototype.first = function() {
      return this.ipv6().startAddress();
    };

    Subnet6.prototype.last = function() {
      return this.ipv6().endAddress();
    };

    Subnet6.prototype.min = function() {
      return this.first().bigInteger();
    };

    Subnet6.prototype.max = function() {
      return this.last().bigInteger();
    };

    Subnet6.prototype.load_subnets = function(depth, callback) {
      var _this = this;
      return this.subnet.type().metadata(function() {
        return _this.subnet.document('subnet_tree', {
          depth: depth
        }, function(err, result) {
          if (err) {
            if (callback) {
              return callback(err);
            }
          } else {
            _this.subnet = result[0];
            if (callback) {
              return callback(err, _this.subnets());
            }
          }
        });
      });
    };

    Subnet6.prototype.subnets = function() {
      var s, subnets;
      if (this._subnets != null) {
        return this._subnets;
      } else {
        subnets = this.subnet.many_rel('subnets');
        if (subnets) {
          this._subnets = (function() {
            var _i, _len, _ref2, _results;
            _ref2 = subnets.map(function(subnet) {
              return new lm.Subnet6(subnet);
            });
            _results = [];
            for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
              s = _ref2[_i];
              if (s.is_valid()) {
                _results.push(s);
              }
            }
            return _results;
          })();
        } else {
          this._subnets = [];
        }
        return this._sort_subnets();
      }
    };

    Subnet6.prototype._sort_subnets = function() {
      return this._subnets.sort(function(a, b) {
        return a.min().compareTo(b.min());
      });
    };

    Subnet6.prototype.find_subnet = function(xnid) {
      var child, found, _i, _len, _ref2;
      if (this.xnid() === xnid) {
        return this;
      }
      _ref2 = this.subnets();
      for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
        child = _ref2[_i];
        found = child.find_subnet(xnid);
        if (found) {
          return found;
        }
      }
    };

    Subnet6.prototype.remove_subnet = function(xnid) {
      var child, subnets, _i, _len, _ref2;
      subnets = this.subnets();
      subnets.forEach(function(child, idx) {
        if (child.xnid() === xnid) {
          subnets.splice(idx, 1);
          return true;
        }
      });
      _ref2 = this.subnets();
      for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
        child = _ref2[_i];
        if (child.remove_subnet(xnid)) {
          return true;
        }
      }
      return false;
    };

    Subnet6.prototype.add_subnet = function(subnet, callback) {
      var blank, found;
      if (subnet.min().compareTo(this.min()) < 0 || subnet.max().compareTo(this.max()) > 0) {
        return callback(new Error('Added subnet is outside the bounds of this subnet'));
      }
      blank = root._.find(lm.Subnet6.blanks(this.tree()), function(b) {
        return subnet.min().compareTo(new BigInteger(b.min)) >= 0 && subnet.max().compareTo(new BigInteger(b.max)) <= 0;
      });
      if (blank) {
        found = this.find_subnet(blank.parent_xnid);
        if (found.mask() === subnet.mask()) {
          return callback(new Error('A subnet must be smaller than its supernet'));
        } else if (found.mask() > subnet.mask()) {
          return callback(new Error('The subnet is too large for its supernet'));
        } else {
          return found._add_child_subnet(subnet, callback);
        }
      } else {
        return callback(new Error('No space fits the added subnet'));
      }
    };

    Subnet6.prototype._add_child_subnet = function(subnet, callback) {
      if (subnet.min().compareTo(this.min()) >= 0) {
        this.subnets().push(subnet);
        this._sort_subnets();
        return callback(void 0, this);
      }
    };

    Subnet6.prototype.leaf = function(parent, scale) {
      return {
        type: 'subnet',
        id: this.xnid(),
        xnid: this.xnid(),
        is_new: this.is_new(),
        is_modified: this.is_modified(),
        network_address: this.network_address(),
        mask: this.mask(),
        name: this.name(),
        direction: this.direction(),
        zone: this.zone(),
        vlans: this.vlans(),
        min: this.min().toString(),
        max: this.max().toString(),
        width: scale(lm.Subnet6.width(this.mask())),
        parent_xnid: parent != null ? parent.xnid() : void 0
      };
    };

    Subnet6.prototype.tree = function(add_mask, parent, scale, max_mask, max_depth) {
      var child, next_start, subnets, tree, _i, _len, _ref2;
      if (max_depth == null) {
        max_depth = 8;
      }
      if (scale == null) {
        scale = this.standard_scale();
      }
      next_start = this.min();
      tree = this.leaf(parent, scale);
      tree.subnets = subnets = [];
      if (max_depth > 0) {
        _ref2 = this.subnets();
        for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
          child = _ref2[_i];
          this.fill_blank_space(add_mask, this, subnets, scale, next_start, child.min().subtract(BigInteger.ONE));
          if (child.mask() > max_mask) {
            subnets.push(child.leaf(this, scale));
          } else {
            subnets.push(child.tree(add_mask, this, scale, max_mask, max_depth - 1));
          }
          next_start = child.max().add(BigInteger.ONE);
        }
        this.fill_blank_space(add_mask, this, subnets, scale, next_start, this.max());
      }
      return tree;
    };

    Subnet6.prototype.fill_blank_space = function(add_mask, parent, array, scale, start, end) {
      var add_width, added, adjust_width, mod_width;
      if (start.compareTo(end) < 0) {
        if ((add_mask != null) && parent.mask() < add_mask) {
          add_width = lm.Subnet6.big_width(add_mask);
          added = start.add(add_width).subtract(BigInteger.ONE);
          if (added.compareTo(end) <= 0) {
            mod_width = start.mod(add_width);
            if (mod_width.toString() === '0') {
              array.push(this._available(parent, scale, start, start.add(add_width).subtract(BigInteger.ONE), add_mask));
              return this.fill_blank_space(add_mask, parent, array, scale, start.add(add_width), end);
            } else {
              adjust_width = add_width.subtract(mod_width);
              array.push(this._blank(parent, scale, start, start.add(adjust_width).subtract(BigInteger.ONE)));
              return this.fill_blank_space(add_mask, parent, array, scale, start.add(adjust_width), end);
            }
          } else {
            return array.push(this._blank(parent, scale, start, end));
          }
        } else {
          return array.push(this._blank(parent, scale, start, end));
        }
      }
    };

    Subnet6.prototype._available = function(parent, scale, start, end, add_mask) {
      var addr, record, v4;
      record = this._blank(parent, scale, start, end);
      record.id = record.id + '&avail';
      record.type = 'available';
      record.mask = add_mask;
      addr = root.v6.Address.fromBigInteger(start);
      addr.subnet = '/' + add_mask;
      addr.subnetMask = add_mask;
      record.address = addr;
      v4 = addr.v4inv6();
      if (v4.match(/::ffff:\d/)) {
        record.network_address = v4.replace('::ffff:', '') + '/' + (add_mask - 96);
      } else {
        record.network_address = addr.correctForm() + addr.subnet;
      }
      return record;
    };

    Subnet6.prototype._blank = function(parent, scale, start, end) {
      return {
        type: 'blank',
        id: parent.xnid() + '#' + start.toString(),
        min: start.toString(),
        max: end.toString(),
        width: lm.Subnet6.range_width(scale, start, end),
        parent_xnid: parent.xnid()
      };
    };

    Subnet6.prototype.standard_scale = function() {
      return lm.Subnet6.scale(lm.Subnet6.max_mask(this.mask()), this.mask());
    };

    Subnet6.blanks = function(tree, array) {
      var subtree, _i, _len, _ref2, _ref3;
      if (array == null) {
        array = [];
      }
      if (tree.type === 'blank') {
        array.push(tree);
      } else {
        _ref3 = (_ref2 = tree.subnets) != null ? _ref2 : [];
        for (_i = 0, _len = _ref3.length; _i < _len; _i++) {
          subtree = _ref3[_i];
          this.blanks(subtree, array);
        }
      }
      return array;
    };

    Subnet6.available = function(tree, array) {
      var subtree, _i, _len, _ref2, _ref3;
      if (array == null) {
        array = [];
      }
      if (tree.type === 'available') {
        array.push(tree);
      } else {
        _ref3 = (_ref2 = tree.subnets) != null ? _ref2 : [];
        for (_i = 0, _len = _ref3.length; _i < _len; _i++) {
          subtree = _ref3[_i];
          this.available(subtree, array);
        }
      }
      return array;
    };

    Subnet6.max_mask = function(mask) {
      mask = mask + 9;
      if (mask > 127) {
        mask = 127;
      }
      return mask;
    };

    Subnet6.width = function(mask) {
      if (mask < 0) {
        mask = 0;
      }
      if (mask > 128) {
        mask = 128;
      }
      return Math.pow(2, 128 - mask);
    };

    Subnet6.big_width = function(mask) {
      return BigInteger.ONE.shiftLeft(128 - mask);
    };

    Subnet6.scale = function(max_mask, mask) {
      return root.d3.scale.linear().domain([0, this.width(mask)]).range([0, 256]).interpolate(this._fix_rounding);
    };

    Subnet6._fix_rounding = function(range_min, range_max) {
      range_max -= range_min;
      return function(number) {
        return Math.round(range_min + range_max * number) / range_max;
      };
    };

    Subnet6.range_width = function(scale, start, end) {
      return scale(end.subtract(start).add(BigInteger.ONE) * 1);
    };

    return Subnet6;

  })();

  lm.OrphanSubnet = (function(_super) {

    __extends(OrphanSubnet, _super);

    function OrphanSubnet(adopter, adoptee) {
      this.adopter = adopter;
      this.adoptee = adoptee;
      this.subnet = this.adopter.subnet;
    }

    OrphanSubnet.prototype.load_subnets = function(depth, callback) {
      return callback(null, [this.adoptee]);
    };

    OrphanSubnet.prototype.subnets = function() {
      return [this.adoptee];
    };

    return OrphanSubnet;

  })(lm.Subnet6);

}).call(this);
}, "xn": function(exports, require, module) {(function() {

  module.exports = require('./xn/root');

  require('./xn/app');

  require('./xn/meta');

  require('./xn/instance');

  require('./xn/resource');

  require('./xn/search');

  require('./xn/data');

  require('./xn/support');

  require('./xn/uri');

}).call(this);
}, "xn/_base": function(exports, require, module) {(function() {

  module.exports = {
    add_mixin: function(target, mixin) {
      var method, name, _ref, _results;
      _ref = mixin.prototype;
      _results = [];
      for (name in _ref) {
        method = _ref[name];
        _results.push(target.prototype[name] = method);
      }
      return _results;
    }
  };

}).call(this);
}, "xn/app": function(exports, require, module) {(function() {
  var root, xn, _ref, _ref1, _ref2,
    __slice = [].slice;

  xn = require('./root');

  root = typeof window !== "undefined" && window !== null ? window : exports;

  if ((_ref = root._) == null) {
    root._ = require('underscore');
  }

  if ((_ref1 = root.ko) == null) {
    root.ko = require('knockout');
  }

  if ((_ref2 = root.dust) == null) {
    root.dust = require('dust.js');
  }

  xn.App = (function() {

    App.DEFAULT_FORMAT = 'full';

    function App(data, events) {
      this.data = data;
      this.events = events;
      this.__values = {};
      this._partials = {};
      this._models = {};
      this._next_id = -1;
    }

    App.prototype.trigger = function() {
      var args, _ref3;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      return (_ref3 = this.events) != null ? _ref3.trigger.apply(_ref3, args) : void 0;
    };

    App.prototype.bind = function() {
      var args, _ref3;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      if (this.events) {
        return (_ref3 = this.events).bind.apply(_ref3, args);
      } else {
        throw new Error('The app has no events object.');
      }
    };

    App.prototype.set_token = function(token, check) {
      if (check == null) {
        check = false;
      }
      this.data.set_token(token);
      if (token !== this.token) {
        this.token = token;
        this.trigger('token:changed');
        if (check) {
          return this.check_token();
        }
      }
    };

    App.prototype.check_token = function(callback) {
      var err,
        _this = this;
      if (this.token) {
        return new xn.meta.Account(this).all(function(err, data) {
          var user;
          user = data != null ? data[0] : void 0;
          if (err) {
            _this.trigger('token:invalid', err);
            _this._change_user();
          } else {
            _this.trigger('token:valid', user);
            _this._change_user(user);
          }
          if (callback) {
            return callback(err, user);
          }
        });
      } else {
        err = new Error('No token set');
        this.trigger('token:invalid', err);
        this._change_user();
        if (callback) {
          return callback(err);
        }
      }
    };

    App.prototype.logout = function() {
      var _this = this;
      if (this.user) {
        return new xn.meta.Account(this).destroy('', function(err, data) {
          console.log('destroyed account', err, data);
          if (err) {
            return console.log('unable to log out???', err);
          } else {
            _this.trigger('token:invalid');
            return _this._change_user();
          }
        });
      }
    };

    App.prototype._change_user = function(user) {
      var _ref3;
      if (((_ref3 = this.user) != null ? _ref3.xnid() : void 0) !== (user != null ? user.xnid() : void 0)) {
        this.user = user;
        return this.trigger('user:changed', user);
      }
    };

    App.prototype.partial = function(part_names, callback) {
      var partial;
      if (root._.isString(part_names)) {
        part_names = [part_names];
      }
      if (!(part_names != null) || part_names.length === 0) {
        throw new Error('No parts specified');
      }
      partial = this._partials[part_names];
      if (!partial) {
        this._partials[part_names] = partial = new xn.meta.Partial(this, part_names);
      }
      if (callback) {
        partial.metadata(function(err, md) {
          return callback(err, partial);
        });
      }
      return partial;
    };

    App.prototype.is = function(part_names, callback) {
      return this.partial(part_names, callback);
    };

    App.prototype.model = function(name, callback) {
      var model;
      if (name == null) {
        throw new Error('No model specified');
      }
      model = this._models[name];
      if (!model) {
        this._models[name] = model = new xn.meta.Model(this, name);
      }
      if (callback) {
        model.metadata(function(err, md) {
          return callback(err, model);
        });
      }
      return model;
    };

    App.prototype.part_names = function(callback) {
      return this.data.part_names(callback);
    };

    App.prototype.model_names = function(callback) {
      return this.data.model_names(callback);
    };

    App.prototype._handle_error = function(callback, create) {
      return function(err, data) {
        if (err) {
          return callback(err, void 0);
        } else {
          return callback(err, create(data));
        }
      };
    };

    App.prototype.next_id = function(values) {
      var id;
      id = this._next_id--;
      if (values) {
        values.id = id;
        this.__values[id] = values;
      }
      return id;
    };

    App.prototype.is_new = function(id) {
      return id < 0;
    };

    App.prototype.instantiate = function(id) {
      var value;
      if (typeof id === 'function') {
        console.log("function is not an id");
        throw new Error("function is not an id");
      }
      if (root._.isObject(id)) {
        console.log("id should be an int, got: " + id);
        throw new Error("id should be an int, got: " + id);
      }
      value = this.__values[id];
      if (value) {
        return new xn.instance.Record(this, value);
      }
    };

    App.prototype.instance = function(id, new_values) {
      var values, _ref3, _ref4, _ref5, _ref6;
      if (root._.isObject(id)) {
        throw new Error("id should be an int, got: " + id);
      }
      if (id != null) {
        values = this.__values[id];
      }
      if (new_values != null) {
        if ((_ref3 = new_values.meta) != null ? _ref3.loaded : void 0) {
          return new_values;
        }
        if (values == null) {
          values = {
            meta: {
              loaded: true,
              model_name: (_ref4 = new_values.meta) != null ? _ref4.model_name : void 0,
              xnid: (_ref5 = new_values.meta) != null ? _ref5.xnid : void 0,
              rel_limit: (_ref6 = new_values.meta) != null ? _ref6.rel_limit : void 0,
              rendered: [],
              times: [],
              updates: 0
            },
            rel: {}
          };
          this.__values[id] = values;
        }
        values = this.instance_merge(values, new_values);
      }
      return values;
    };

    App.prototype.instance_merge = function(values, new_values) {
      var k, rel, rel_name, rel_value, v, _ref3;
      if ((_ref3 = new_values.meta) != null ? _ref3.loaded : void 0) {
        return new_values;
      }
      for (k in new_values) {
        v = new_values[k];
        if (k === 'meta') {
          values.meta.rendered = _.union(values.meta.rendered, v.rendered);
          values.meta.times.push(new Date);
          if (v.rel_limit && values.meta.rel_limit && values.meta.rel_limit < v.rel_limit) {
            values.meta.rel_limit = v.rel_limit;
          }
        } else if (k === 'rel') {
          for (rel_name in v) {
            rel_value = v[rel_name];
            if (Array.isArray(rel_value)) {
              values.rel[rel_name] = (function() {
                var _i, _len, _ref4, _results;
                _ref4 = this._rel_instances(rel_value);
                _results = [];
                for (_i = 0, _len = _ref4.length; _i < _len; _i++) {
                  rel = _ref4[_i];
                  _results.push(rel.id);
                }
                return _results;
              }).call(this);
            } else {
              rel = this._rel_instances([rel_value])[0];
              values.rel[rel_name] = rel.id;
            }
          }
        } else {
          values[k] = v;
        }
      }
      if (values.meta) {
        values.meta.updates += 1;
      }
      return values;
    };

    App.prototype._rel_instances = function(rels) {
      var rel, _i, _len, _results;
      _results = [];
      for (_i = 0, _len = rels.length; _i < _len; _i++) {
        rel = rels[_i];
        if (root._.isObject(rel)) {
          _results.push(this.instance(rel.id, rel));
        } else {
          console.log('just got the id here...', rel);
          _results.push({
            id: rel
          });
        }
      }
      return _results;
    };

    App.prototype.xnid = function(xnid, callback) {
      return this.xnid_with_format(xnid, xn.App.DEFAULT_FORMAT, callback);
    };

    App.prototype.xnid_with_format = function(xnid, format, callback) {
      var id, model, _, _ref3;
      _ref3 = xnid.split('/'), _ = _ref3[0], _ = _ref3[1], model = _ref3[2], _ = _ref3[3], id = _ref3[4];
      if (callback) {
        return this.model(model).find_with_format(id, format, callback);
      } else {
        return this.model(model).id(id);
      }
    };

    return App;

  })();

}).call(this);
}, "xn/data": function(exports, require, module) {(function() {
  var xn;

  xn = require('./root');

  xn.data = {};

  require('./data/cache');

  require('./data/jquery_xhr');

  require('./data/socket_io');

}).call(this);
}, "xn/data/cache": function(exports, require, module) {(function() {
  var xn;

  xn = require('../root');

  xn.data.Cache = (function() {

    function Cache(fallback, cache_failures, cache) {
      var _ref;
      this.fallback = fallback;
      this.cache_failures = cache_failures;
      this.cache = cache;
      if ((_ref = this.cache) == null) {
        this.cache = {
          model: {},
          partial: {},
          part_names: {},
          model_names: {},
          get: {}
        };
      }
      this.failed = '#failed';
    }

    Cache.prototype.set_token = function(token) {
      return this.fallback.set_token(token);
    };

    Cache.prototype.get = function(url, callback) {
      return this._cached('get', url, this.cache.get[url], callback);
    };

    Cache.prototype.put = function(url, body, callback) {
      return this.fallback.put(url, body, callback);
    };

    Cache.prototype.patch = function(url, body, callback) {
      return this.fallback.patch(url, body, callback);
    };

    Cache.prototype.post = function(url, body, callback) {
      return this.fallback.post(url, body, callback);
    };

    Cache.prototype.del = function(url, body, callback) {
      return this.fallback.del(url, body, callback);
    };

    Cache.prototype.partial = function(part_names, callback) {
      return this._cached('partial', part_names, this.cache.partial[part_names], callback);
    };

    Cache.prototype.model = function(name, callback) {
      return this._cached('model', name, this.cache.model[name], callback);
    };

    Cache.prototype.part_names = function(callback) {
      return this._cached('part_names', null, this.cache.part_names[null], callback);
    };

    Cache.prototype.model_names = function(callback) {
      return this._cached('model_names', null, this.cache.model_names[null], callback);
    };

    Cache.prototype._cached = function(method, key, data, callback) {
      var cache_callback,
        _this = this;
      if (data != null) {
        if (data === this.failed) {
          return callback(new Error('cached failure'), void 0);
        } else {
          return callback(void 0, data);
        }
      } else if (this.fallback && this.fallback[method]) {
        cache_callback = function(err, new_data) {
          if (err) {
            if (_this.cache_failures) {
              _this.cache[method][key] = _this.failed;
            }
            return callback(err, void 0);
          } else {
            _this.cache[method][key] = new_data;
            return callback(err, new_data);
          }
        };
        if (key) {
          return this.fallback[method](key, cache_callback);
        } else {
          return this.fallback[method](cache_callback);
        }
      } else {
        return callback(void 0, void 0);
      }
    };

    return Cache;

  })();

}).call(this);
}, "xn/data/file": function(exports, require, module) {(function() {
  var path, xn;

  xn = require('../root');

  path = require('path');

  xn.data.File = (function() {

    function File(fs, root_path) {
      this.fs = fs;
      this.root_path = root_path;
    }

    File.prototype.set_token = function(token) {};

    File.prototype.partial = function(part_names, callback) {
      var file_name;
      file_name = "" + this.root_path + "/partial-" + (part_names.join('-')) + ".json";
      if (file_name !== 'spec/fixtures/partial-not-found.json') {
        if (!path.existsSync(file_name)) {
          console.log(" ../get /is/" + (part_names.join(',')) + "/metadata | cat > " + file_name);
        }
      }
      return this.fs.readFile(file_name, this._parser(callback));
    };

    File.prototype.model = function(name, callback) {
      var file_name;
      file_name = "" + this.root_path + "/model-" + name + ".json";
      if (file_name !== "spec/fixtures/model-not_found.json") {
        if (!path.existsSync(file_name)) {
          console.log(" ../get /model/" + name + "/metadata | cat > " + file_name);
        }
      }
      return this.fs.readFile(file_name, this._parser(callback));
    };

    File.prototype.part_names = function(callback) {
      return this._parser(callback)(null, '[]');
    };

    File.prototype.model_names = function(callback) {
      return this._parser(callback)(null, '[]');
    };

    File.prototype._parser = function(callback) {
      return function(err, data) {
        if (err) {
          return callback(err, data);
        } else {
          try {
            return callback(err, JSON.parse(data));
          } catch (e) {
            return callback(e, data);
          }
        }
      };
    };

    File.prototype._request = function(method, url, callback) {
      var file_name;
      file_name = "" + this.root_path + "/" + method + "-" + (url.replace(/\//g, '-')) + ".json";
      if (!path.existsSync(file_name)) {
        console.log(" ../" + method + " " + url + " | cat > " + file_name);
      }
      return this.fs.readFile(file_name, this._parser(callback));
    };

    File.prototype.get = function(url, callback) {
      return this._request('get', url, callback);
    };

    File.prototype.put = function(url, callback) {
      return this._request('put', url, callback);
    };

    File.prototype.patch = function(url, callback) {
      return this._request('patch', url, callback);
    };

    File.prototype.post = function(url, callback) {
      return this._request('post', url, callback);
    };

    File.prototype.del = function(url, callback) {
      return this._request('del', url, callback);
    };

    return File;

  })();

}).call(this);
}, "xn/data/jquery_xhr": function(exports, require, module) {(function() {
  var xn;

  xn = require('../root');

  xn.data.JQueryXhr = (function() {

    function JQueryXhr(jQuery, base_url) {
      var _ref;
      this.jQuery = jQuery;
      this.base_url = base_url;
      if ((_ref = this.base_url) == null) {
        this.base_url = '';
      }
      this.headers = {
        'X-Rel-Block': 'true'
      };
    }

    JQueryXhr.prototype.set_token = function(token) {
      return this.headers['AUTHORIZATION'] = token;
    };

    JQueryXhr.prototype._request = function(type, url, body, callback) {
      var json;
      if (body) {
        json = JSON.stringify(body);
      }
      return this.jQuery.ajax({
        url: url,
        type: type,
        contentType: 'text/json',
        processData: false,
        data: json,
        dataType: 'json',
        success: function(data) {
          return callback(void 0, data);
        },
        error: function(xhr, status, error) {
          return callback(error || status, xhr);
        },
        headers: this.headers
      });
    };

    JQueryXhr.prototype.get = function(url, callback) {
      return this._request('GET', this.base_url + url, void 0, callback);
    };

    JQueryXhr.prototype.put = function(url, body, callback) {
      return this._request('PUT', this.base_url + url, body, callback);
    };

    JQueryXhr.prototype.patch = function(url, body, callback) {
      return this._request('PATCH', this.base_url + url, body, callback);
    };

    JQueryXhr.prototype.post = function(url, body, callback) {
      return this._request('POST', this.base_url + url, body, callback);
    };

    JQueryXhr.prototype.del = function(url, body, callback) {
      return this._request('DELETE', this.base_url + url, body, callback);
    };

    JQueryXhr.prototype.partial = function(part_names, callback) {
      return this._request('GET', [this.base_url, 'is', part_names.join(','), 'metadata'].join('/'), void 0, callback);
    };

    JQueryXhr.prototype.model = function(name, callback) {
      return this._request('GET', [this.base_url, 'model', name, 'metadata'].join('/'), void 0, callback);
    };

    JQueryXhr.prototype.part_names = function(callback) {
      return this._request('GET', [this.base_url, 'is'].join('/'), void 0, callback);
    };

    JQueryXhr.prototype.model_names = function(callback) {
      return this._request('GET', [this.base_url, 'model'].join('/'), void 0, callback);
    };

    return JQueryXhr;

  })();

}).call(this);
}, "xn/data/socket_io": function(exports, require, module) {(function() {
  var xn;

  xn = require('../root');

  xn.data.SocketIO = (function() {

    function SocketIO(io, url, port) {
      this.io = io;
      this.socket = io.connect(url, port);
      this.callbacks = {};
      this.errors = [];
      this._create_messaage_handler();
      this._schedule_timeout_check();
    }

    SocketIO.prototype.set_token = function(token) {
      this.token = token;
    };

    SocketIO.prototype.timeout = 5000;

    SocketIO.prototype.partial = function(part_names, callback) {
      return this._request("get/is/" + (part_names.join(',')) + "/metadata", callback);
    };

    SocketIO.prototype.model = function(name, callback) {
      return this._request("get/model/" + name + "/metadata", callback);
    };

    SocketIO.prototype.part_names = function(callback) {
      return this._request("get/is", callback);
    };

    SocketIO.prototype.model_names = function(callback) {
      return this._request("get/model", callback);
    };

    SocketIO.prototype._now = function() {
      return new Date().getTime();
    };

    SocketIO.prototype._request = function(uri, callback) {
      if (this.callbacks[uri] != null) {
        this.callbacks[uri].push([callback, this._now()]);
      } else {
        this.callbacks[uri] = [[callback, this._now()]];
      }
      return this.socket.send(uri);
    };

    SocketIO.prototype._create_messaage_handler = function() {
      var _this = this;
      return this.socket.on('message', function(message) {
        var callback_info, callbacks, data, key, response, _results;
        try {
          data = JSON.parse(message);
        } catch (e) {
          _this.errors.push([[e, message], _this._now()]);
        }
        if (data) {
          _results = [];
          for (key in data) {
            response = data[key];
            callbacks = _this.callbacks[key];
            if (callbacks != null) {
              _results.push((function() {
                var _i, _len, _results1;
                _results1 = [];
                for (_i = 0, _len = callbacks.length; _i < _len; _i++) {
                  callback_info = callbacks[_i];
                  _results1.push(callback_info[0](void 0, response));
                }
                return _results1;
              })());
            } else {
              _results.push(void 0);
            }
          }
          return _results;
        }
      });
    };

    SocketIO.prototype._schedule_timeout_check = function() {
      var _this = this;
      return setTimeout((function() {
        var callback, callbacks, key, time, too_old, _i, _len, _ref, _ref1;
        too_old = _this._now() - _this.timeout;
        _ref = _this.callbacks;
        for (key in _ref) {
          callbacks = _ref[key];
          for (_i = 0, _len = callbacks.length; _i < _len; _i++) {
            _ref1 = callbacks[_i], callback = _ref1[0], time = _ref1[1];
            if (time < too_old) {
              callback('Timeout or response parse error', _errors_after(time));
            }
          }
        }
        return _this._remove_old_errors(too_old);
      }), 500);
    };

    SocketIO.prototype._errors_after = function(too_old) {
      var error, time, _i, _len, _ref, _ref1, _results;
      _ref = this.errors;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        _ref1 = _ref[_i], error = _ref1[0], time = _ref1[1];
        if (time > too_old) {
          _results.push(error);
        }
      }
      return _results;
    };

    SocketIO.prototype._remove_old_errors = function(too_old) {
      var error, time;
      return this.errors = (function() {
        var _i, _len, _ref, _ref1, _results;
        _ref = this.errors;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          _ref1 = _ref[_i], error = _ref1[0], time = _ref1[1];
          if (time > too_old) {
            _results.push([error, time]);
          }
        }
        return _results;
      }).call(this);
    };

    return SocketIO;

  })();

}).call(this);
}, "xn/instance": function(exports, require, module) {(function() {
  var xn;

  xn = require('./root');

  xn.instance = {};

  require('./instance/record');

  require('./instance/filter');

}).call(this);
}, "xn/instance/filter": function(exports, require, module) {(function() {
  var root, xn, _ref,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  xn = require('../root');

  root = typeof window !== "undefined" && window !== null ? window : exports;

  if ((_ref = root._) == null) {
    root._ = require('underscore');
  }

  xn.instance.Filter = (function(_super) {

    __extends(Filter, _super);

    function Filter(based_on, name, data, seq) {
      var _this = this;
      this.based_on = based_on;
      this.name = name;
      this.seq = seq;
      if (this.based_on == null) {
        throw new Error("Filter must be based on a type or resource");
      }
      if (this.name == null) {
        throw new Error("No filter name specified");
      }
      if (data == null) {
        data = {};
      }
      Filter.__super__.constructor.call(this, this.based_on.app, this.based_on.app.instance_merge({}, data));
      this.metadata(function(err, md) {
        if (!md) {
          return _this._err = new Error("Filter " + _this.name + " not found for " + (_this.based_on.url()));
        }
        return _this.properties();
      });
    }

    Filter.prototype._exec_get_metadata = function(callback) {
      var _this = this;
      return this.based_on.type().metadata(function(err, md) {
        if (err) {
          return callback(err, md);
        } else {
          return callback(err, md.filters[_this.name]);
        }
      });
    };

    Filter.prototype._properties_key = 'arguments';

    Filter.prototype.url_fragment = function() {
      if (this.has_value()) {
        return "" + this.name + "~" + this.seq;
      }
    };

    Filter.prototype.has_value = function() {
      return root._.without(root._.keys(this.known_values()), 'rel').length > 0;
    };

    Filter.prototype.query_string = function() {
      var data;
      data = {};
      if (this.has_value()) {
        data[this.url_fragment()] = this.known_values();
        return this.param(data);
      }
    };

    Filter.prototype.known_values = function() {
      var obj;
      obj = Filter.__super__.known_values.apply(this, arguments);
      delete obj.meta;
      return obj;
    };

    Filter.prototype.param = function(a) {
      var prefix, s, value;
      s = [];
      for (prefix in a) {
        value = a[prefix];
        this._buildParams(prefix, a[prefix], function(key, value) {
          return s[s.length] = key + "=" + encodeURIComponent(value);
        });
      }
      return s.join("&").replace(/%20/g, "+").replace(/%2C/g, ',');
    };

    Filter.prototype._buildParams = function(prefix, obj, add) {
      var i, key, name, v, value, _results, _results1;
      if (root._.isArray(obj)) {
        _results = [];
        for (i in obj) {
          v = obj[i];
          key = ((typeof v === "object" || root._.isArray(v)) && i) || "";
          _results.push(this._buildParams("" + prefix + "[" + key + "]", v, add));
        }
        return _results;
      } else if (obj !== null && typeof obj === "object") {
        _results1 = [];
        for (name in obj) {
          value = obj[name];
          _results1.push(this._buildParams("" + prefix + "[" + name + "]", value, add));
        }
        return _results1;
      } else {
        return add(prefix, obj);
      }
    };

    return Filter;

  })(xn.instance.Record);

  xn.add_mixin(xn.instance.Filter, xn.meta.Metadata);

  xn.add_mixin(xn.instance.Filter, xn.meta.Properties);

}).call(this);
}, "xn/instance/record": function(exports, require, module) {(function() {
  var root, xn, _ref,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  xn = require('../root');

  root = typeof window !== "undefined" && window !== null ? window : exports;

  if ((_ref = root._) == null) {
    root._ = require('underscore');
  }

  xn.instance.Record = (function() {

    function Record(app, data) {
      this.app = app;
      this.id = __bind(this.id, this);

      this._reset(data);
      this._on_change = {};
    }

    Record.prototype.xnid = function() {
      var _ref1, _ref2;
      if ((_ref1 = this._original.meta) != null ? _ref1.xnid : void 0) {
        return (_ref2 = this._original.meta) != null ? _ref2.xnid : void 0;
      } else if (this.model_name()) {
        return "/model/" + (this.model_name()) + "/id/" + (this.id());
      } else if (this.part_names() && this.part_names().length > 0) {
        return "/is/" + (this.part_names().join(',')) + "/id/" + (this.id());
      }
    };

    Record.prototype.meta_info = function() {
      return this._original.meta;
    };

    Record.prototype.url = function() {
      if (this.is_new()) {
        throw new Error('New record does not have a URL');
      } else {
        return this.xnid();
      }
    };

    Record.prototype.uri = function() {
      return this.url() + this.query_string();
    };

    Record.prototype.query_string = function() {
      if (this.format) {
        return "?format=" + this.format;
      }
    };

    Record.prototype.id = function() {
      if (this._original.id) {
        return this._original.id;
      } else {
        return this.app.next_id(this._original);
      }
    };

    Record.prototype.is_new = function() {
      return this.id() < 0;
    };

    Record.prototype.part_names = function() {
      var _ref1;
      return (_ref1 = this._original.meta) != null ? _ref1.rendered : void 0;
    };

    Record.prototype.model_name = function() {
      var _ref1;
      return (_ref1 = this._original.meta) != null ? _ref1.model_name : void 0;
    };

    Record.prototype.format = function() {
      var _ref1;
      return (_ref1 = this._original.meta) != null ? _ref1.format : void 0;
    };

    Record.prototype.set_model = function(model) {
      var meta, _base, _ref1;
      if (this.is_new()) {
        meta = (_ref1 = (_base = this._original).meta) != null ? _ref1 : _base.meta = {};
        meta.model_name = model.name();
        return model.on_metadata(function() {
          return meta.rendered = model.parts();
        });
      } else {
        throw new Error("Can't change the model of an existing record");
      }
    };

    Record.prototype.set_partial = function(partial) {
      var meta, _base, _ref1;
      if (this.is_new()) {
        meta = (_ref1 = (_base = this._original).meta) != null ? _ref1 : _base.meta = {};
        return meta.rendered = partial.parts();
      } else {
        throw new Error("Can't change the model of an existing record");
      }
    };

    Record.prototype.partial = function(opt_callback) {
      var part_names;
      part_names = this.part_names();
      if (part_names && part_names.length > 0) {
        return this.app.partial(part_names, opt_callback);
      }
    };

    Record.prototype.model = function(opt_callback) {
      var model_name;
      model_name = this.model_name();
      if (model_name) {
        return this.app.model(model_name, opt_callback);
      }
    };

    Record.prototype.type = function(opt_callback) {
      if (this.model_name()) {
        return this.model(opt_callback);
      } else if (this.part_names() && this.part_names().length > 0) {
        return this.partial(opt_callback);
      } else {
        return this.app.partial(['record'], opt_callback);
      }
    };

    Record.prototype.original = function() {
      return new this.constructor(this.app, this._original);
    };

    Record.prototype.attr = function(name, value) {
      var prev;
      if (value !== void 0) {
        prev = this.attr(name);
        if (prev === value) {
          return;
        }
        this._current[name] = value;
        this._changed.push(name);
        this._fire_change(name, value, prev);
        return value;
      } else if (this.changed(name)) {
        return this._current[name];
      } else {
        return this._original[name];
      }
    };

    Record.prototype.one_rel = function(name, val) {
      var id;
      if (val !== void 0) {
        if (val === null) {
          return this.one_rel_id(name, null);
        } else if (val.constructor === this.constructor) {
          return this.one_rel_id(name, val.id());
        } else {
          throw new Error("Expected a Record");
        }
      } else {
        id = this.one_rel_id(name);
        if (id) {
          return this.app.instantiate(id);
        }
      }
    };

    Record.prototype.one_rel_id = function(name, value) {
      var prev, _ref1;
      if (value !== void 0) {
        prev = this.one_rel(name);
        this._current_rel[name] = value;
        this._rel_changes[name] = {
          set: value
        };
        this._changed.push(name);
        this._fire_change(name, value, prev);
        return value;
      } else if (this.changed(name)) {
        return this._current_rel[name];
      } else {
        return (_ref1 = this._original.rel) != null ? _ref1[name] : void 0;
      }
    };

    Record.prototype.many_rel = function(name, changes_or_fn, options) {
      var id, ids, records, _i, _len, _results,
        _this = this;
      if (options == null) {
        options = {};
      }
      if (typeof changes_or_fn === 'function') {
        if (!options.force && (records = this.many_rel(name))) {
          changes_or_fn(void 0, records);
          return records;
        } else if (this.is_new() || options.local) {
          records = [];
          changes_or_fn(void 0, []);
          return records;
        } else {
          this.rel(name, function(err, insts) {
            var inst;
            if (!err) {
              _this._current_rel[name] = (function() {
                var _i, _len, _results;
                _results = [];
                for (_i = 0, _len = insts.length; _i < _len; _i++) {
                  inst = insts[_i];
                  _results.push(inst.id());
                }
                return _results;
              })();
            }
            return changes_or_fn(err, insts);
          });
          return null;
        }
      } else if (changes_or_fn) {
        this.many_rel_ids(name, this._to_change_ids(changes_or_fn));
        return this.many_rel(name);
      } else {
        ids = this.many_rel_ids(name);
        if (ids) {
          _results = [];
          for (_i = 0, _len = ids.length; _i < _len; _i++) {
            id = ids[_i];
            _results.push(this.app.instantiate(id));
          }
          return _results;
        }
      }
    };

    Record.prototype.many_rel_ids = function(name, changes) {
      var next, prev, _ref1, _ref2, _ref3;
      if (changes != null) {
        prev = this.many_rel_ids(name);
        this._combine_changes(name, changes);
        next = this._apply_changes(name, prev, changes);
        if (!_.isEqual(prev, next)) {
          this._current_rel[name] = next;
          this._changed.push(name);
          this._fire_change(name, next, prev);
        }
        return next;
      } else if (this.changed(name)) {
        return this._current_rel[name];
      } else {
        return (_ref1 = (_ref2 = this._original.rel) != null ? _ref2[name] : void 0) != null ? _ref1 : (_ref3 = this._current_rel) != null ? _ref3[name] : void 0;
      }
    };

    Record.prototype.errors = function() {
      var _ref1;
      return (_ref1 = this._errors) != null ? _ref1 : this._errors = new xn.support.Errors;
    };

    Record.prototype.validation_errors = function(errors) {
      var name, prop, _ref1;
      if (!errors) {
        errors = this.errors();
        errors.clear();
      }
      _ref1 = this.partial().cached_properties || {};
      for (name in _ref1) {
        prop = _ref1[name];
        prop.validate(this.attr(name), errors);
      }
      return errors;
    };

    Record.prototype.valid = function() {
      return this.validation_errors().empty();
    };

    Record.prototype.known_values = function() {
      var values, _ref1;
      values = root._.extend({}, this._original, this._current);
      values.rel = root._.extend({}, (_ref1 = this._original.rel) != null ? _ref1 : {}, this._current_rel);
      return values;
    };

    Record.prototype.on_change = function(name, f) {
      var c;
      c = this._on_change[name];
      if (c == null) {
        c = this._on_change[name] = [];
      }
      if (f) {
        c.push(f);
        return this;
      } else {
        return c;
      }
    };

    Record.prototype.remove_on_change = function(name, f) {
      var c, i;
      c = this._on_change[name];
      if (!(c != null) || (i = c.indexOf(f) === -1)) {

      } else {
        return c.splice(i, 1);
      }
    };

    Record.prototype.changed = function(name) {
      return root._.include(this._changed, name);
    };

    Record.prototype.is_modified = function() {
      return this._changed.length > 0;
    };

    Record.prototype.modifications = function() {
      return root._.extend({}, this._current, this._rel_changes);
    };

    Record.prototype.toJSON = function(nesting) {
      var id, ids, name, rel_ids, rels, result, _ref1;
      if (nesting == null) {
        nesting = 1;
      }
      result = root._.extend({}, this._original, this._current);
      rel_ids = root._.extend({}, (_ref1 = this._original.rel) != null ? _ref1 : {}, this._current_rel);
      rels = result.rel = {};
      if (nesting > 0) {
        for (name in rel_ids) {
          ids = rel_ids[name];
          rels[name] = (function() {
            var _i, _len, _ref2, _results;
            _ref2 = this._array_wrap(ids);
            _results = [];
            for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
              id = _ref2[_i];
              _results.push(this.app.instantiate(id).toJSON(nesting - 1));
            }
            return _results;
          }).call(this);
        }
      }
      return result;
    };

    Record.prototype.valid_on_server = function(callback) {
      return Xn.xnid(this.xnid()).errors(callback);
    };

    Record.prototype.save = kew.magic(function(callback) {
      var mods,
        _this = this;
      mods = this.modifications();
      if (Object.keys(mods).length === 0) {
        return callback(void 0, false, {}, []);
      } else if (this.is_new()) {
        return this.model().create(mods, function(err, id, values, validations) {
          if (!err) {
            _this.errors().load(validations);
            _this._reload(values);
          }
          if (callback) {
            return callback(err, id, values, validations);
          }
        });
      } else {
        return this.model().update(this.id(), mods, function(err, result) {
          var updated, validations, values;
          if (!err) {
            updated = result[0], validations = result[1], values = result[2];
            _this.errors().load(validations);
            _this._reload(values);
          }
          if (callback) {
            return callback(err, updated, values, validations);
          }
        });
      }
    });

    Record.prototype.refresh = function(callback) {
      return this.refresh_with_format('full', callback);
    };

    Record.prototype.refresh_with_format = kew.magic(function(format, callback) {
      var res,
        _this = this;
      if (this.is_new()) {
        throw new Error('Can not refresh unsaved record');
      }
      res = new xn.Resource(this);
      res.format = format;
      return res.get(function(err, values) {
        if (err) {
          return callback(err, values);
        } else if (values.length !== 1) {
          return callback(new Error("Logic error: Reload did not return one value"), values);
        } else {
          if (!err) {
            _this._refresh(values[0]);
          }
          if (callback) {
            return callback(err, values[0]);
          }
        }
      });
    });

    Record.prototype.reload = function(callback) {
      var _this = this;
      return this.refresh(function(err, values) {
        if (!err) {
          _this._reset();
        }
        if (callback) {
          return callback(err, values);
        }
      });
    };

    Record.prototype.is = function(parts) {
      return this.partial(parts).with_id(this.id());
    };

    Record.prototype.rel = function(name, callback) {
      var r, rel;
      r = this.type().relationship(name);
      if (r) {
        rel = r.for_record(this);
        if (callback) {
          return rel.all(callback);
        } else {
          return rel;
        }
      }
    };

    Record.prototype.action = function(name, args, callback) {
      return this.model().with_id(this.id()).action(name, args, callback);
    };

    Record.prototype.job = function(name, args, callback) {
      return this.type().with_id(this.id()).job(name, args, callback);
    };

    Record.prototype.document = function(name, args, callback) {
      return this.type().with_id(this.id()).document(name, args, callback);
    };

    Record.prototype.report = function(name, args, callback) {
      return this.type().with_id(this.id()).report(name, args, callback);
    };

    Record.prototype.traversal = function(name, args, callback) {
      if (args == null) {
        args = {};
      }
      return this.type().with_id(this.id()).traversal(name, args, callback);
    };

    Record.prototype.to = function(name, args, callback) {
      if (args == null) {
        args = {};
      }
      return this.type().with_id(this.id()).to(name, args, callback);
    };

    Record.prototype.history = function(args, callback) {
      var doc;
      if (args == null) {
        args = {};
      }
      doc = new xn.History(this.type().with_id(this.id()), null, args);
      if (callback) {
        doc.all(callback);
      }
      return doc;
    };

    Record.prototype.destroy = function(callback) {
      var _this = this;
      return this.model().destroy(this.id(), function(err, details) {
        if (callback) {
          return callback(err, details);
        }
      });
    };

    Record.prototype.resource = function(url, callback) {
      var r;
      r = new xn.Resource(this, url);
      if (callback) {
        r.all(callback);
      }
      return r;
    };

    Record.prototype._reset = function(original) {
      var _ref1, _ref2;
      if (original) {
        this._original = original;
      }
      if ((_ref1 = this._original) == null) {
        this._original = {};
      }
      this._current = {};
      this._current_rel = {};
      this._changed = [];
      this._rel_changes = {};
      return this.format = (_ref2 = this._original.meta) != null ? _ref2.format : void 0;
    };

    Record.prototype._reload = function(values) {
      return this._reset(this.app.instance(values.id, values));
    };

    Record.prototype._refresh = function(values) {
      return this._original = this.app.instance(values.id, values);
    };

    Record.prototype._fire_change = function(name, value, prev) {
      var f, _i, _len, _ref1, _results;
      _ref1 = this.on_change(name);
      _results = [];
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        f = _ref1[_i];
        _results.push(f(this, name, value, prev));
      }
      return _results;
    };

    Record.prototype._array_wrap = function(value) {
      if (root._.isArray(value)) {
        return value;
      } else {
        return [value];
      }
    };

    Record.prototype._assert_records = function(a) {
      var r, _i, _len, _ref1, _results;
      _ref1 = this._array_wrap(a);
      _results = [];
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        r = _ref1[_i];
        if (r.constructor !== this.constructor) {
          throw new Error("Expected an array of Records");
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    };

    Record.prototype._to_change_ids = function(changes) {
      var ids, rel;
      ids = {};
      if (changes.add) {
        this._assert_records(changes.add);
        ids.add = (function() {
          var _i, _len, _ref1, _results;
          _ref1 = this._array_wrap(changes.add);
          _results = [];
          for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
            rel = _ref1[_i];
            _results.push(rel.id());
          }
          return _results;
        }).call(this);
      }
      if (changes.remove) {
        this._assert_records(changes.remove);
        ids.remove = (function() {
          var _i, _len, _ref1, _results;
          _ref1 = this._array_wrap(changes.remove);
          _results = [];
          for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
            rel = _ref1[_i];
            _results.push(rel.id());
          }
          return _results;
        }).call(this);
      }
      if (changes.set) {
        this._assert_records(changes.set);
        ids.set = (function() {
          var _i, _len, _ref1, _results;
          _ref1 = this._array_wrap(changes.set);
          _results = [];
          for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
            rel = _ref1[_i];
            _results.push(rel.id());
          }
          return _results;
        }).call(this);
      }
      return ids;
    };

    Record.prototype._combine_changes = function(name, changes) {
      var combined, _base, _ref1;
      combined = (_ref1 = (_base = this._rel_changes)[name]) != null ? _ref1 : _base[name] = {
        add: [],
        remove: []
      };
      if (changes.set) {
        combined.add = [];
        combined.remove = [];
        combined.set = this._array_wrap(changes.set);
      } else {
        if (changes.add) {
          combined.add = combined.add.concat(this._array_wrap(changes.add));
          combined.remove = root._.difference(combined.remove, this._array_wrap(changes.add));
        }
        if (changes.remove) {
          combined.remove = combined.remove.concat(this._array_wrap(changes.remove));
          combined.add = root._.difference(combined.add, this._array_wrap(changes.remove));
        }
      }
      return null;
    };

    Record.prototype._apply_changes = function(name, prev, changes) {
      var next;
      next = prev != null ? prev : [];
      if (changes.set) {
        next = this._array_wrap(changes.set);
      } else {
        if (changes.add) {
          next = next.concat(this._array_wrap(changes.add));
        }
        if (changes.remove) {
          next = root._.difference(next, this._array_wrap(changes.remove));
        }
      }
      return _.unique(next);
    };

    Record.prototype.render = function(context, template, callback) {
      return dust.render(template, context.push(this.toJSON()), callback);
    };

    return Record;

  })();

}).call(this);
}, "xn/meta": function(exports, require, module) {(function() {
  var xn;

  xn = require('./root');

  xn.meta = {};

  require('./meta/type');

  require('./meta/abstract_resource');

  require('./meta/account');

  require('./meta/mixins');

  require('./meta/rel');

  require('./meta/partial');

  require('./meta/model');

  require('./meta/method');

  require('./meta/history');

}).call(this);
}, "xn/meta/abstract_resource": function(exports, require, module) {(function() {
  var xn;

  xn = require('../root');

  xn.meta.AbstractResource = (function() {

    function AbstractResource() {}

    AbstractResource.prototype.url = function() {
      return void 0;
    };

    AbstractResource.prototype.type = function() {
      return void 0;
    };

    AbstractResource.prototype.sequence = function() {
      return void 0;
    };

    AbstractResource.prototype.query_string = function() {
      return null;
    };

    AbstractResource.prototype.set_limit = function(limit) {
      this.limit = limit;
      return this;
    };

    AbstractResource.prototype.set_format = function(format) {
      this.format = format;
      return this;
    };

    AbstractResource.prototype.set_rel_limit = function(rel_limit) {
      this.rel_limit = rel_limit;
      return this;
    };

    AbstractResource.prototype.final_query_string = function() {
      var qs, _ref, _ref1, _ref2, _ref3;
      qs = this.query_string();
      qs = this._add_qs_field(qs, 'limit', this.limit || ((_ref = this.based_on) != null ? _ref.limit : void 0));
      qs = this._add_qs_field(qs, 'offset', this.offset || ((_ref1 = this.based_on) != null ? _ref1.offset : void 0));
      qs = this._add_qs_field(qs, 'format', this.format || ((_ref2 = this.based_on) != null ? _ref2.format : void 0));
      return qs = this._add_qs_field(qs, 'rel_limit', this.rel_limit || ((_ref3 = this.based_on) != null ? _ref3.rel_limit : void 0));
    };

    AbstractResource.prototype.metadata = function(callback) {
      if (this.type()) {
        return this.type().metadata(callback);
      } else {
        return callback(new Error('Resource has no type'));
      }
    };

    AbstractResource.prototype.set_format = function(format) {
      this.format = format;
      return this;
    };

    AbstractResource.prototype.set_rel_limit = function(rel_limit) {
      this.rel_limit = rel_limit;
      return this;
    };

    AbstractResource.prototype.set_limit = function(limit) {
      this.limit = limit;
      return this;
    };

    AbstractResource.prototype.parts = function(callback) {
      if (this.type()) {
        return this.type().parts(callback);
      }
    };

    AbstractResource.prototype.uri = function() {
      var qs;
      qs = this.final_query_string();
      if (qs) {
        return "" + (this.url()) + "?" + qs;
      } else {
        return this.url();
      }
    };

    AbstractResource.prototype.find = function(id, callback) {
      return this.find_with_format(id, xn.App.DEFAULT_FORMAT, callback);
    };

    AbstractResource.prototype.find_with_format = kew.magic(function(id, format, callback) {
      var data, res,
        _this = this;
      this.set_format(format);
      data = this.app.instance(id);
      if (data && data.meta.rendered.indexOf(this.description()) >= 0) {
        if (callback) {
          return callback(void 0, this.instance(id));
        }
      } else {
        res = new xn.Resource(this, "id/" + id);
        return res.get(function(err, data) {
          if (err) {
            if (callback) {
              return callback(err, data);
            }
          } else {
            data = data[0];
            if (data) {
              return _this._ensure_metadata(function(err) {
                var inst;
                inst = _this.instance(data.id, data);
                if (callback) {
                  return callback(err, inst, data);
                }
              });
            } else if (callback) {
              return callback(new Error("" + (res.url()) + " Not Found"));
            }
          }
        });
      }
    });

    AbstractResource.prototype.description = function() {
      return this.type().description();
    };

    AbstractResource.prototype.update = function(id, properties, callback) {
      return new xn.Resource(this, "id/" + id, null).patch(properties, callback);
    };

    AbstractResource.prototype.destroy = kew.magic(function(id, callback) {
      return new xn.Resource(this, "id/" + id).del(callback);
    });

    AbstractResource.prototype.all = kew.magic(function(callback) {
      return this.get(this._result(callback));
    });

    AbstractResource.prototype._result = function(callback) {
      var _this = this;
      return function(err, data) {
        if (!callback) {

        } else if (err) {
          return callback(err, data);
        } else {
          return _this._ensure_metadata(function(err) {
            var instances, record;
            if (err) {
              return callback(err);
            } else if (_this.type().length === 0) {
              return callback(void 0, data);
            } else {
              instances = (function() {
                var _i, _len, _results;
                _results = [];
                for (_i = 0, _len = data.length; _i < _len; _i++) {
                  record = data[_i];
                  _results.push(this.instance(record.id, record));
                }
                return _results;
              }).call(_this);
              return callback(void 0, instances, data);
            }
          });
        }
      };
    };

    AbstractResource.prototype.first = function(callback) {
      var r,
        _this = this;
      r = new xn.Resource(this, 'first');
      if (callback) {
        r.get(function(err, data) {
          if (err) {
            return callback(err, data);
          } else {
            if (data[0]) {
              return _this._ensure_metadata(function(err) {
                return callback(err, _this.instance(data[0].id, data[0]), data);
              });
            } else {
              return callback();
            }
          }
        });
      }
      return r;
    };

    AbstractResource.prototype.unique = function(callback) {
      var r;
      r = new xn.Resource(this, 'unique');
      if (callback) {
        r.get(callback);
      }
      return r;
    };

    AbstractResource.prototype.count = function(callback) {
      var r;
      r = new xn.Resource(this, 'count');
      if (callback) {
        r.get(callback);
      }
      return r;
    };

    AbstractResource.prototype.errors = function(callback) {
      var r;
      r = new xn.Resource(this, 'errors');
      if (callback) {
        r.get(callback);
      }
      return r;
    };

    AbstractResource.prototype.instance = function(id, record) {
      return this.type().instance(id, record);
    };

    AbstractResource.prototype.with_id = function(id) {
      return new xn.Resource(this, "id/" + id);
    };

    AbstractResource.prototype.id = function(id) {
      var search;
      search = new xn.Search(this);
      search.set_ids([id]);
      return search;
    };

    AbstractResource.prototype.search = function(ids) {
      var search;
      search = new xn.Search(this);
      if (ids) {
        search.set_ids(ids);
      }
      return search;
    };

    AbstractResource.prototype.is = function(parts) {
      var r;
      r = new xn.Resource(this, "is/" + (parts.join(',')));
      r.set_result_type(this.app.partial(parts));
      return r;
    };

    AbstractResource.prototype.model = function(model) {
      var r;
      r = new xn.Resource(this, "model/" + model);
      r.set_result_type(this.app.model(model));
      return r;
    };

    AbstractResource.prototype.to = function(name, args, callback) {
      var t;
      if (args == null) {
        args = {};
      }
      t = new xn.RouteTraversal(this, name, args);
      if (callback) {
        t.all(callback);
      }
      return t;
    };

    AbstractResource.prototype.job = function(name, args, callback) {
      var job;
      if (args == null) {
        args = {};
      }
      job = new xn.Job(this, name, args);
      if (callback) {
        job.execute(callback);
      }
      return job;
    };

    AbstractResource.prototype.traversal = function(name, args, callback) {
      var t;
      if (args == null) {
        args = {};
      }
      t = new xn.Traversal(this, name, args);
      if (callback) {
        t.all(callback);
      }
      return t;
    };

    AbstractResource.prototype.action = function(name, args, callback) {
      var action;
      if (args == null) {
        args = {};
      }
      action = new xn.Action(this, name, args);
      if (callback) {
        action.execute(callback);
      }
      return action;
    };

    AbstractResource.prototype.document = function(name, args, callback) {
      var doc;
      if (args == null) {
        args = {};
      }
      doc = new xn.Document(this, name, args);
      if (callback) {
        doc.all(callback);
      }
      return doc;
    };

    AbstractResource.prototype.report = function(name, args, callback) {
      var report;
      if (args == null) {
        args = {};
      }
      report = new xn.Report(this, name, args);
      if (callback) {
        report.all(callback);
      }
      return report;
    };

    AbstractResource.prototype.rel = function(name) {
      var rel;
      rel = new xn.meta.rel.Unknown(this, name);
      return rel.known || rel;
    };

    AbstractResource.prototype.paths = function(callback) {
      var p;
      p = new xn.PathsResource(this, "paths");
      if (callback) {
        p.all(callback);
      }
      return p;
    };

    AbstractResource.prototype.resource = function(url_fragment) {
      return new xn.Resource(this, url_fragment);
    };

    AbstractResource.prototype.get = function(callback) {
      var _this = this;
      this._if_real(callback, function() {
        return _this._current_request = _this.app.data.get(_this.uri(), callback || (function() {}));
      });
      return this;
    };

    AbstractResource.prototype.put = function(body, callback) {
      var _this = this;
      this._if_real(callback, function() {
        return _this._current_request = _this.app.data.put(_this.uri(), body, callback || (function() {}));
      });
      return this;
    };

    AbstractResource.prototype.patch = function(body, callback) {
      var _this = this;
      this._if_real(callback, function() {
        return _this._current_request = _this.app.data.patch(_this.uri(), body, callback || (function() {}));
      });
      return this;
    };

    AbstractResource.prototype.post = function(body, callback) {
      var _this = this;
      this._if_real(callback, function() {
        return _this._current_request = _this.app.data.post(_this.uri(), body, callback || (function() {}));
      });
      return this;
    };

    AbstractResource.prototype.del = function(callback) {
      var _this = this;
      this._if_real(callback, function() {
        return _this._current_request = _this.app.data.del(_this.uri(), void 0, callback || (function() {}));
      });
      return this;
    };

    AbstractResource.prototype._if_real = function(callback, cont) {
      var _ref;
      if ((_ref = this.based_on) != null ? typeof _ref.is_new === "function" ? _ref.is_new() : void 0 : void 0) {
        return callback(new Error("Can't make a resource request on a new record"));
      } else {
        return cont();
      }
    };

    AbstractResource.prototype.abort = function() {
      var _ref;
      if ((_ref = this._current_request) != null) {
        _ref.abort();
      }
      return this;
    };

    AbstractResource.prototype._add_qs_field = function(qs, name, value) {
      if (value && qs) {
        return "" + qs + "&" + name + "=" + value;
      } else if (value) {
        return "" + name + "=" + value;
      } else {
        return qs;
      }
    };

    AbstractResource.prototype._ensure_metadata = function(callback) {
      return callback();
    };

    return AbstractResource;

  })();

}).call(this);
}, "xn/meta/account": function(exports, require, module) {(function() {
  var xn,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  xn = require('../root');

  xn.meta.BaseResource = (function(_super) {

    __extends(BaseResource, _super);

    BaseResource.prototype.type_name = 'BaseResource';

    function BaseResource(app, path, _query_string) {
      this.app = app;
      this.path = path;
      this._query_string = _query_string != null ? _query_string : '';
    }

    BaseResource.prototype.name = function() {
      return "<" + this.type_name + ": " + this.path + ">";
    };

    BaseResource.prototype.description = function() {
      return this.path;
    };

    BaseResource.prototype.url = function() {
      return this.path;
    };

    BaseResource.prototype.type = function() {
      return this.app.is('record');
    };

    BaseResource.prototype.sequence = function() {
      return new xn.support.Sequence;
    };

    BaseResource.prototype.query_string = function() {
      return this._query_string;
    };

    return BaseResource;

  })(xn.meta.AbstractResource);

  xn.meta.Account = (function(_super) {

    __extends(Account, _super);

    Account.prototype.type_name = 'Account';

    function Account(app) {
      this.app = app;
      Account.__super__.constructor.call(this, this.app, '/account');
    }

    Account.prototype.type = function() {
      return this.app.is('user');
    };

    Account.prototype.destroy = kew.magic(function(id, callback) {
      return new xn.Resource(this, "").del(callback);
    });

    return Account;

  })(xn.meta.BaseResource);

}).call(this);
}, "xn/meta/history": function(exports, require, module) {(function() {
  var root, xn, _ref,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  xn = require('../root');

  root = typeof window !== "undefined" && window !== null ? window : exports;

  if ((_ref = root._) == null) {
    root._ = require('underscore');
  }

  xn.History = (function(_super) {

    __extends(History, _super);

    History.prototype._method = 'get';

    function History(based_on, request_arguments) {
      this.based_on = based_on;
      this.request_arguments = request_arguments;
      this.app = this.based_on.app;
    }

    History.prototype.url = function() {
      return root._([this.based_on.url(), 'history']).join('/');
    };

    History.prototype._result = function(callback) {
      var _this = this;
      return function(err, data) {
        if (!callback) {

        } else if (err) {
          return callback(err, data);
        } else {
          return callback(void 0, data);
        }
      };
    };

    return History;

  })(xn.meta.AbstractResource);

}).call(this);
}, "xn/meta/method": function(exports, require, module) {(function() {
  var root, xn, _ref,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  xn = require('../root');

  root = typeof window !== "undefined" && window !== null ? window : exports;

  if ((_ref = root._) == null) {
    root._ = require('underscore');
  }

  xn.AbstractMethod = (function(_super) {

    __extends(AbstractMethod, _super);

    function AbstractMethod(based_on, name, request_arguments) {
      var _this = this;
      this.based_on = based_on;
      this.name = name;
      this.request_arguments = request_arguments;
      this.app = this.based_on.app;
      this.based_on.metadata(function(err, md) {
        var m;
        if (err) {
          throw err;
        }
        if (!err) {
          m = md.methods[_this.name];
          if (m && m.type === _this._metadata_type) {
            _this._part = m.part;
            _this._parts = m.return_parts;
            _this._type = _this._return_parts(m);
            return _this._arguments = m["arguments"];
          } else if (m) {
            throw new Error("Expected method '" + _this.name + "' type '" + _this._metadata_type + "' but got '" + m.type + "'");
          } else {
            throw new Error("Method '" + _this.name + "' not found");
          }
        }
      });
    }

    AbstractMethod.prototype.part = function() {
      if (this._part) {
        return this._part;
      } else {
        throw new Error('metadata not loaded');
      }
    };

    AbstractMethod.prototype.parts = function(callback) {
      var _this = this;
      if (this._parts) {
        if (callback) {
          callback(void 0, this._parts);
        }
      } else {
        this.based_on.metadata(function(err, md) {
          if (callback) {
            if (err) {
              return callback(err);
            }
            return root._.defer(function() {
              return callback(void 0, _this._parts);
            });
          }
        });
      }
      return this._parts;
    };

    AbstractMethod.prototype["arguments"] = function(callback) {
      var _this = this;
      if (this._arguments) {
        if (callback) {
          callback(void 0, this._arguments);
        }
      } else {
        this.based_on.metadata(function(err, md) {
          if (callback) {
            if (err) {
              return callback(err);
            }
            return root._.defer(function() {
              return callback(void 0, _this._arguments);
            });
          }
        });
      }
      return this._arguments;
    };

    AbstractMethod.prototype.type = function() {
      if (this._type != null) {
        return this._type;
      } else {
        throw new Error('metadata not loaded');
      }
    };

    AbstractMethod.prototype._ensure_metadata = function(callback) {
      if (this.based_on.metadata) {
        return this.based_on.metadata(callback);
      } else {
        return callback();
      }
    };

    AbstractMethod.prototype.url = function() {
      return root._([this.based_on.url(), this._url_type, this.name]).join('/');
    };

    AbstractMethod.prototype.return_result = function(b) {
      if (b == null) {
        b = true;
      }
      this._return_result = b;
      return this;
    };

    AbstractMethod.prototype.query_string = function() {
      var qs;
      qs = this.based_on.query_string();
      if (this._return_result) {
        return this._add_qs_field(qs, 'return_result', true);
      } else {
        return qs;
      }
    };

    AbstractMethod.prototype.sequence = function() {
      var _ref1;
      return (_ref1 = this._sequence) != null ? _ref1 : this._sequence = this.based_on.sequence();
    };

    AbstractMethod.prototype._return_parts = function(m) {
      return Xn.is(m.return_parts);
    };

    return AbstractMethod;

  })(xn.meta.AbstractResource);

  xn.RouteTraversal = (function(_super) {

    __extends(RouteTraversal, _super);

    function RouteTraversal() {
      return RouteTraversal.__super__.constructor.apply(this, arguments);
    }

    RouteTraversal.prototype._url_type = 'to';

    RouteTraversal.prototype._metadata_type = 'route_traversal';

    RouteTraversal.prototype._method = 'get';

    return RouteTraversal;

  })(xn.AbstractMethod);

  xn.Job = (function(_super) {

    __extends(Job, _super);

    function Job() {
      return Job.__super__.constructor.apply(this, arguments);
    }

    Job.prototype._url_type = 'job';

    Job.prototype._metadata_type = 'job';

    Job.prototype._method = 'post';

    Job.prototype.execute = function(callback) {
      return this.post(this.request_arguments, this._result(callback));
    };

    Job.prototype._return_parts = function(m) {
      if (this.__return_result) {
        if (m.return_parts.length > 0) {
          return Xn.is(m.return_parts);
        }
      } else {
        return Xn.is('job');
      }
    };

    return Job;

  })(xn.AbstractMethod);

  xn.Traversal = (function(_super) {

    __extends(Traversal, _super);

    function Traversal() {
      return Traversal.__super__.constructor.apply(this, arguments);
    }

    Traversal.prototype._url_type = 'traversal';

    Traversal.prototype._metadata_type = 'traversal';

    Traversal.prototype._method = 'get';

    return Traversal;

  })(xn.AbstractMethod);

  xn.Action = (function(_super) {

    __extends(Action, _super);

    function Action() {
      return Action.__super__.constructor.apply(this, arguments);
    }

    Action.prototype._url_type = 'action';

    Action.prototype._metadata_type = 'action';

    Action.prototype._method = 'post';

    Action.prototype.execute = function(callback) {
      return this.post(this.request_arguments, this._result(callback));
    };

    Action.prototype._return_parts = function(m) {
      if (this._return_result) {
        if (m.return_parts.length > 0) {
          return Xn.is(m.return_parts);
        }
      } else {
        return Xn.is('job');
      }
    };

    return Action;

  })(xn.AbstractMethod);

  xn.Document = (function(_super) {

    __extends(Document, _super);

    function Document() {
      return Document.__super__.constructor.apply(this, arguments);
    }

    Document.prototype._url_type = 'document';

    Document.prototype._metadata_type = 'document';

    Document.prototype._method = 'get';

    Document.prototype._return_parts = function(m) {
      if (m.return_parts.length) {
        return Document.__super__._return_parts.apply(this, arguments);
      } else {
        return [];
      }
    };

    return Document;

  })(xn.AbstractMethod);

  xn.Report = (function(_super) {

    __extends(Report, _super);

    function Report() {
      return Report.__super__.constructor.apply(this, arguments);
    }

    Report.prototype._url_type = 'report';

    Report.prototype._metadata_type = 'report';

    Report.prototype._method = 'get';

    Report.prototype._return_parts = function(m) {
      if (m.return_parts.length) {
        return Report.__super__._return_parts.apply(this, arguments);
      } else {
        return [];
      }
    };

    return Report;

  })(xn.AbstractMethod);

}).call(this);
}, "xn/meta/mixins": function(exports, require, module) {(function() {
  var root, xn, _ref;

  xn = require('../root');

  root = typeof window !== "undefined" && window !== null ? window : exports;

  if ((_ref = root._) == null) {
    root._ = require('underscore');
  }

  xn.meta.Metadata = (function() {

    function Metadata() {}

    Metadata.prototype.metadata = function(callback) {
      if (this._metadata_executed) {
        if (callback) {
          this.on_metadata(callback);
        }
      } else {
        this._metadata_executed = true;
        this._get_metadata(callback);
      }
      return this._metadata;
    };

    Metadata.prototype.on_metadata = function(callback) {
      if (this._metadata) {
        return callback.apply(null, this._metadata);
      } else {
        return this._on_metadata.push(callback);
      }
    };

    Metadata.prototype.has_metadata = function() {
      var err, md, _ref1;
      if (this._metadata) {
        _ref1 = this._metadata, err = _ref1[0], md = _ref1[1];
        return !err && md;
      }
    };

    Metadata.prototype._reset_metadata = function() {
      var _ref1;
      this._metadata_executed = false;
      this._metadata = void 0;
      return (_ref1 = this._on_metadata) != null ? _ref1 : this._on_metadata = [];
    };

    Metadata.prototype._set_metadata = function(err, md) {
      this._metadata_executed = true;
      this._metadata = [err, md];
      if (this._on_metadata) {
        this._on_metadata.forEach(function(on_md) {
          return on_md(err, md);
        });
      }
      return this._on_metadata = void 0;
    };

    Metadata.prototype._get_metadata = function(callback) {
      var _this = this;
      return this._exec_get_metadata(function(err, md) {
        _this._set_metadata(err, md);
        if (callback) {
          return callback(err, md);
        }
      });
    };

    return Metadata;

  })();

  xn.meta.Properties = (function() {

    function Properties() {}

    Properties.prototype.property_names = function(callback) {
      var _this = this;
      return this.metadata(function(err, md) {
        var properties;
        if (err) {
          return callback([]);
        } else {
          if (_this._displays_key) {
            properties = root._.extend({}, md[_this._properties_key], md[_this._displays_key]);
          } else {
            properties = md[_this._properties_key];
          }
          return callback(root._.keys(properties));
        }
      });
    };

    Properties.prototype.properties = function(callback) {
      var name, prop, _ref1, _results,
        _this = this;
      if (this.cached_properties) {
        if (callback) {
          callback((function() {
            var _ref1, _results;
            _ref1 = this.cached_properties;
            _results = [];
            for (name in _ref1) {
              prop = _ref1[name];
              _results.push(prop);
            }
            return _results;
          }).call(this));
        }
      } else {
        this.property_names(function(names) {
          var cache, _i, _len;
          cache = {};
          for (_i = 0, _len = names.length; _i < _len; _i++) {
            name = names[_i];
            cache[name] = _this.property(name);
          }
          _this.cached_properties = cache;
          if (callback) {
            return callback((function() {
              var _results;
              _results = [];
              for (name in cache) {
                prop = cache[name];
                _results.push(prop);
              }
              return _results;
            })());
          }
        });
      }
      _ref1 = this.cached_properties;
      _results = [];
      for (name in _ref1) {
        prop = _ref1[name];
        _results.push(prop);
      }
      return _results;
    };

    Properties.prototype.property = function(name, callback) {
      var get_prop, prop,
        _this = this;
      if (this.cached_properties) {
        prop = this.cached_properties[name];
        if (prop && callback) {
          callback(prop);
        }
        return prop;
      } else {
        get_prop = function(err, md) {
          var type;
          if (!err) {
            prop = md[_this._properties_key][name];
            if (_this._displays_key) {
              if (prop == null) {
                prop = md[_this._displays_key][name];
              }
            }
            if (prop != null) {
              type = xn.meta.type[prop.type];
              if (type) {
                return new type(prop);
              } else {
                throw new Error("Unknown property type " + prop.type);
              }
            }
          }
        };
        if (callback) {
          return this.metadata(function(err, md) {
            return callback(get_prop(err, md));
          });
        } else if (this._metadata) {
          return get_prop.apply(null, this._metadata);
        }
      }
    };

    Properties.prototype.traversals = function(callback) {
      var _this = this;
      if (this._traversals) {
        if (callback) {
          callback(this._traversals);
        }
      } else {
        this.metadata(function(err, md) {
          var method, name;
          if (err) {
            if (callback) {
              return callback([]);
            }
          } else {
            _this._traversals = (function() {
              var _ref1, _results;
              _ref1 = md.methods;
              _results = [];
              for (name in _ref1) {
                method = _ref1[name];
                if (method.type === 'route_traversal') {
                  _results.push(name);
                }
              }
              return _results;
            })();
            if (callback) {
              return callback(_this._traversals);
            }
          }
        });
      }
      return this._traversals;
    };

    Properties.prototype.validation_rules = function() {
      var name, prop, _ref1, _results;
      if (this.cached_properties) {
        _ref1 = this.cached_properties;
        _results = [];
        for (name in _ref1) {
          prop = _ref1[name];
          _results.push([name, prop.validations()]);
        }
        return _results;
      } else {
        return [];
      }
    };

    return Properties;

  })();

}).call(this);
}, "xn/meta/model": function(exports, require, module) {(function() {
  var root, xn, _ref,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  xn = require('../root');

  root = typeof window !== "undefined" && window !== null ? window : exports;

  if ((_ref = root._) == null) {
    root._ = require('underscore');
  }

  xn.meta.Model = (function(_super) {

    __extends(Model, _super);

    function Model(app, _name) {
      this._name = _name;
      Model.__super__.constructor.call(this, app);
    }

    Model.prototype.name = function() {
      return this._name;
    };

    Model.prototype.parts = function(callback) {
      return this._metadata_property('parts', callback);
    };

    Model.prototype.descriptive_parts = function(callback) {
      return this._metadata_property('descriptive_parts', callback) || [];
    };

    Model.prototype.description = function() {
      return "model/" + this._name;
    };

    Model.prototype.url_fragment = function() {
      return "model/" + (this.name());
    };

    Model.prototype.build = function(attrs) {
      var inst, meta, name, value;
      meta = {};
      meta.model_name = this.name();
      meta.rendered = this.parts();
      inst = this.instance(this.app.next_id(), {
        rel: {},
        meta: meta
      });
      if (attrs) {
        for (name in attrs) {
          value = attrs[name];
          inst.attr(name, value);
        }
      }
      return inst;
    };

    Model.prototype.create = kew.magic(function(values, callback) {
      var _this = this;
      return new xn.Resource(this, null, null).put(values, function(err, data) {
        var id, record, validations;
        if (err) {
          return callback(err, data);
        } else {
          id = data[0], validations = data[1], record = data[2];
          return callback(err, id, record, validations);
        }
      });
    });

    Model.prototype._exec_get_metadata = function(callback) {
      return this.app.data.model(this._name, callback);
    };

    Model.prototype._metadata_property = function(property, callback) {
      var err, md, _ref1;
      this.metadata(function(err, md) {
        if (err) {
          if (callback) {
            return callback(err, md);
          }
        } else {
          if (callback) {
            return callback(void 0, md[property]);
          }
        }
      });
      if (this._metadata) {
        _ref1 = this._metadata, err = _ref1[0], md = _ref1[1];
        return md[property];
      }
    };

    return Model;

  })(xn.meta.Partial);

}).call(this);
}, "xn/meta/partial": function(exports, require, module) {(function() {
  var xn,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  xn = require('../root');

  xn.meta.Partial = (function(_super) {

    __extends(Partial, _super);

    function Partial(app, _parts) {
      this.app = app;
      this._parts = _parts;
      this.reset_metadata();
    }

    Partial.prototype.metadata = function(callback) {
      if (this._metadata_executed) {
        if (callback) {
          this.on_metadata(callback);
        }
      } else {
        this._metadata_executed = true;
        this._get_metadata(callback);
      }
      return this._metadata;
    };

    Partial.prototype.p_metadata = function() {
      var promise;
      promise = kew.defer();
      this.metadata(promise.makeNodeResolver());
      return promise;
    };

    Partial.prototype.build = function(new_values) {
      var inst, meta;
      meta = {};
      meta.model_name = null;
      meta.rendered = this.parts();
      inst = this.instance(this.app.next_id(), {
        rel: {},
        meta: meta
      });
      inst.set(new_values);
      return inst;
    };

    Partial.prototype.name = function() {
      return "<Partial: " + (this.parts()) + ">";
    };

    Partial.prototype.reset_metadata = function() {
      this._reset_metadata();
      this._rels = {};
      this.cached_properties = void 0;
      return this._generate_rels();
    };

    Partial.prototype._exec_get_metadata = function(callback) {
      if (this._parts) {
        return this.app.data.partial(this._parts, callback);
      } else {
        throw new Error('Resource instantiated incorrectly');
      }
    };

    Partial.prototype.has_part = function(part) {
      return _.contains(this.parts(), part);
    };

    Partial.prototype.parts = function(callback) {
      if (callback) {
        callback(void 0, this._parts);
      }
      return this._parts;
    };

    Partial.prototype.description = function() {
      if (this._parts) {
        return "is/" + this._parts[this._parts.length - 1];
      } else {
        return "is/?";
      }
    };

    Partial.prototype.template = function(prefix, callback) {
      return this.parts(function(err, parts) {
        var idx, t, _i, _ref;
        if (err) {
          if (callback) {
            return callback(err);
          }
        } else {
          for (idx = _i = _ref = parts.length - 1; _ref <= 0 ? _i <= 0 : _i >= 0; idx = _ref <= 0 ? ++_i : --_i) {
            t = "" + prefix + parts[idx];
            if (dust.cache[t]) {
              if (callback) {
                callback(void 0, t);
              }
              return t;
            }
          }
          if (callback) {
            return callback();
          }
        }
      });
    };

    Partial.prototype.relationship = function(name) {
      var rel;
      if (this.has_metadata()) {
        if (this._rels[name] === void 0) {
          rel = new xn.meta.rel.Unknown(this, name).known;
          return this._set_known_rel(name, rel);
        } else {
          return this._rels[name];
        }
      } else if (this._rels[name]) {
        return this._rels[name];
      } else {
        rel = new xn.meta.rel.Unknown(this, name);
        return rel;
      }
    };

    Partial.prototype._set_known_rel = function(name, rel) {
      if (rel.valid) {
        return this._rels[name] = rel;
      } else {
        return this._rels[name] = null;
      }
    };

    Partial._metadata_getter = function(type) {
      return function() {
        var metadata, method, name, _, _ref, _ref1, _results;
        _ref = this._metadata, _ = _ref[0], metadata = _ref[1];
        if (this.has_metadata()) {
          _ref1 = metadata.methods;
          _results = [];
          for (name in _ref1) {
            method = _ref1[name];
            if (method.type === type) {
              _results.push(method);
            }
          }
          return _results;
        } else {
          throw "Requested " + type + " before metadata is loaded";
        }
      };
    };

    Partial.prototype.actions = Partial._metadata_getter('action');

    Partial.prototype.jobs = Partial._metadata_getter('job');

    Partial.prototype.route_traversals = Partial._metadata_getter('to');

    Partial.prototype.routes = Partial._metadata_getter('route');

    Partial.prototype.relationships = function() {
      var name, rel, _ref, _results;
      _ref = this._rels;
      _results = [];
      for (name in _ref) {
        rel = _ref[name];
        _results.push(rel);
      }
      return _results;
    };

    Partial.prototype.to_relationships = function() {
      var name, rel, _ref, _results;
      _ref = this._rels;
      _results = [];
      for (name in _ref) {
        rel = _ref[name];
        if (rel.direction === 'to') {
          _results.push(rel);
        }
      }
      return _results;
    };

    Partial.prototype.from_relationships = function() {
      var name, rel, _ref, _results;
      _ref = this._rels;
      _results = [];
      for (name in _ref) {
        rel = _ref[name];
        if (rel.direction === 'from') {
          _results.push(rel);
        }
      }
      return _results;
    };

    Partial.prototype.instance = function(id, values) {
      return new xn.instance.Record(this.app, this.app.instance(id, values));
    };

    Partial.prototype._properties_key = 'properties';

    Partial.prototype._displays_key = 'displays';

    Partial.prototype._add_methods = function() {
      var name, rel, _ref, _results,
        _this = this;
      this.properties(function(props) {
        var prop, _i, _len, _results;
        _results = [];
        for (_i = 0, _len = props.length; _i < _len; _i++) {
          prop = props[_i];
          _results.push(prop.add_methods(_this._instance_class.prototype));
        }
        return _results;
      });
      _ref = this._rels;
      _results = [];
      for (name in _ref) {
        rel = _ref[name];
        if (rel) {
          _results.push(rel.add_methods(this._instance_class.prototype));
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    };

    Partial.prototype._generate_rels = function() {
      var _this = this;
      return this.on_metadata(function(err, md) {
        var name, _ref, _results;
        if (!err) {
          _ref = md.relationships;
          _results = [];
          for (name in _ref) {
            md = _ref[name];
            if (name && !(_this._rels[name] != null)) {
              _results.push(_this.relationship(name));
            }
          }
          return _results;
        }
      });
    };

    Partial.prototype.url_fragment = function() {
      return "is/" + (this._parts.join(','));
    };

    Partial.prototype.url = function() {
      return "/" + (this.url_fragment());
    };

    Partial.prototype.sequence = function() {
      return new xn.support.Sequence;
    };

    Partial.prototype.type = function() {
      return this;
    };

    Partial.prototype.create_filter = function(name, attrs, num) {
      return new xn.instance.Filter(this, name, attrs, num);
    };

    return Partial;

  })(xn.meta.AbstractResource);

  xn.add_mixin(xn.meta.Partial, xn.meta.Metadata);

  xn.add_mixin(xn.meta.Partial, xn.meta.Properties);

}).call(this);
}, "xn/meta/rel": function(exports, require, module) {(function() {
  var root, xn, _ref,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  xn = require('../root');

  root = typeof window !== "undefined" && window !== null ? window : exports;

  if ((_ref = root._) == null) {
    root._ = require('underscore');
  }

  xn.meta.rel = {};

  xn.meta.Rel = (function(_super) {

    __extends(Rel, _super);

    function Rel(r) {
      this.app = r.app;
      this.based_on = r.based_on;
      this.name = r.name;
      this.direction = r.direction;
      this.clone = r.clone;
      this.label = r.label;
      this._from_type = r._from_type;
      if (r._metadata) {
        this._metadata = r._metadata;
      }
      if (r._to_type) {
        this._to_type = r._to_type;
      }
      if (r._part) {
        this._part = r._part;
      }
      if (r._err) {
        this._err = r._err;
      }
    }

    Rel.prototype.load = function(callback) {
      if (callback) {
        return callback(this);
      }
    };

    Rel.prototype.on_load = function(callback) {
      if (callback) {
        return callback(this);
      }
    };

    Rel.prototype.url = function() {
      return "" + (this.based_on.url()) + "/rel/" + this.name;
    };

    Rel.prototype.type = function() {
      return this._to_type;
    };

    Rel.prototype.part = function() {
      return this._part;
    };

    Rel.prototype.parts = function(callback) {
      if (callback) {
        callback(void 0, [this._part]);
      }
      return [this._part];
    };

    Rel.prototype.for_record = function(record) {
      return {
        __proto__: this,
        based_on: record
      };
    };

    Rel.prototype.query_string = function() {
      return this.based_on.query_string();
    };

    Rel.prototype.sequence = function() {
      var _ref1;
      return (_ref1 = this._sequence) != null ? _ref1 : this._sequence = this.based_on.sequence();
    };

    Rel.prototype.unknown = false;

    Rel.prototype.available = function(callback) {
      var r;
      r = new xn.meta.Available(this);
      if (callback) {
        r.get(callback);
      }
      return r;
    };

    return Rel;

  })(xn.meta.AbstractResource);

  xn.meta.rel.Unknown = (function(_super) {

    __extends(Unknown, _super);

    function Unknown(based_on, name) {
      var _this = this;
      this.based_on = based_on;
      this.name = name;
      this.app = this.based_on.app;
      this._on_load = [];
      this._from_type = this.based_on.type();
      this._from_type.on_metadata(function(err, md) {
        var on_load, _i, _len, _ref1, _results;
        _this._err = err;
        if (md) {
          _this._metadata = md.relationships[_this.name];
        }
        _this.known = _this._build_relationship();
        if (_this.based_on === _this._from_type) {
          _this._from_type._rels[_this.name] = _this.known;
        }
        _ref1 = _this._on_load;
        _results = [];
        for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
          on_load = _ref1[_i];
          _results.push(on_load(_this.known));
        }
        return _results;
      });
    }

    Unknown.prototype._build_relationship = function() {
      var _ref1;
      if (this._metadata) {
        this._to_type = this.app.partial([this._metadata.result_part]);
        this._part = this._metadata.part;
        this.direction = this._metadata.direction;
        this.label = this._metadata.edge_label;
        this.clone = this._metadata.clone;
        if (this._metadata.cardinality === 'one') {
          return new xn.meta.rel.One(this);
        } else {
          return new xn.meta.rel.Many(this);
        }
      } else {
        if ((_ref1 = this._err) == null) {
          this._err = new Error("Relationship not found for " + (this.url()));
        }
        return new xn.meta.rel.Invalid(this);
      }
    };

    Unknown.prototype.load = function(callback) {
      if (callback) {
        this.on_load(callback);
      }
      return this.known || this._from_type.metadata();
    };

    Unknown.prototype.on_load = function(callback) {
      if (this._metadata) {
        if (callback) {
          return callback(this.known);
        }
      } else {
        if (callback) {
          return this._on_load.push(callback);
        }
      }
    };

    Unknown.prototype.ready = function(callback) {
      return this.on_load(function() {
        return root._.defer(callback);
      });
    };

    Unknown.prototype.type = function() {
      if (this._to_type != null) {
        return this._to_type;
      } else {
        throw new Error('metadata not loaded');
      }
    };

    Unknown.prototype.part = function() {
      if (this._part) {
        return this._part;
      } else {
        throw new Error('metadata not loaded');
      }
    };

    Unknown.prototype.parts = function(callback) {
      return this.on_load(function() {
        return callback(this._err, [this._part]);
      });
    };

    Unknown.prototype.rel_type = 'unknown';

    Unknown.prototype.unknown = true;

    return Unknown;

  })(xn.meta.Rel);

  xn.meta.rel.Invalid = (function(_super) {

    __extends(Invalid, _super);

    function Invalid() {
      return Invalid.__super__.constructor.apply(this, arguments);
    }

    Invalid.prototype.url = function() {
      throw this._err;
    };

    Invalid.prototype.type = function() {
      throw this._err;
    };

    Invalid.prototype.rel_type = 'invalid';

    Invalid.prototype.valid = false;

    return Invalid;

  })(xn.meta.Rel);

  xn.meta.rel.Many = (function(_super) {

    __extends(Many, _super);

    function Many() {
      return Many.__super__.constructor.apply(this, arguments);
    }

    Many.prototype.rel_type = 'many';

    Many.prototype.cardinality = 'many';

    Many.prototype.valid = true;

    return Many;

  })(xn.meta.Rel);

  xn.meta.rel.One = (function(_super) {

    __extends(One, _super);

    function One() {
      return One.__super__.constructor.apply(this, arguments);
    }

    One.prototype.rel_type = 'one';

    One.prototype.cardinality = 'one';

    One.prototype.valid = true;

    return One;

  })(xn.meta.Rel);

  xn.meta.Available = (function(_super) {

    __extends(Available, _super);

    function Available() {
      return Available.__super__.constructor.apply(this, arguments);
    }

    Available.prototype.rel_type = 'available';

    Available.prototype.url = function() {
      return "" + (this.based_on.url()) + "/available/" + this.name;
    };

    return Available;

  })(xn.meta.Rel);

}).call(this);
}, "xn/meta/type": function(exports, require, module) {(function() {
  var root, xn, _ref,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  xn = require('../root');

  root = typeof window !== "undefined" && window !== null ? window : exports;

  if ((_ref = root._) == null) {
    root._ = require('underscore');
  }

  xn.meta.type = (function() {

    function type(_meta) {
      this._meta = _meta;
    }

    type.prototype.type = function() {
      return this._meta.type;
    };

    type.prototype.name = function() {
      return this._meta.name;
    };

    type.prototype.label = function() {
      return this._meta.label;
    };

    type.prototype.units = function() {
      return this._meta.units;
    };

    type.prototype.validations = function() {
      return this._meta.validations;
    };

    type.prototype.validate = function(value, errors) {
      return this._validate_presence(value, errors);
    };

    type.prototype._validate_presence = function(value, errors) {
      if (!this.validations().allow_blank) {
        if (this.is_blank(value)) {
          return errors.add('property', this.name(), 'is required');
        }
      }
    };

    type.prototype.is_blank = function(value) {
      return !value || (value.match && value.match(/^\s*$/));
    };

    return type;

  })();

  xn.meta.type.display = (function(_super) {

    __extends(display, _super);

    function display() {
      return display.__super__.constructor.apply(this, arguments);
    }

    display.prototype.validations = function() {
      return [];
    };

    display.prototype.read_only = true;

    return display;

  })(xn.meta.type);

  xn.meta.type.text = (function(_super) {

    __extends(text, _super);

    function text() {
      return text.__super__.constructor.apply(this, arguments);
    }

    return text;

  })(xn.meta.type);

  xn.meta.type.select = (function(_super) {

    __extends(select, _super);

    function select() {
      return select.__super__.constructor.apply(this, arguments);
    }

    select.prototype.options = function() {
      return this._meta.options;
    };

    select.prototype.limit_to_list = function() {
      return this.validations().limit_to_list;
    };

    select.prototype.validate = function(value, errors) {
      select.__super__.validate.apply(this, arguments);
      if (!this.is_blank(value)) {
        return this._validate_in_list(value, errors);
      }
    };

    select.prototype._validation_options = function() {
      var opt, _i, _len, _ref1, _results;
      if (this.limit_to_list() === 'case_sensitive') {
        return this.options();
      } else {
        _ref1 = this.options();
        _results = [];
        for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
          opt = _ref1[_i];
          _results.push(this.lower_case(opt));
        }
        return _results;
      }
    };

    select.prototype._validate_in_list = function(value, errors) {
      var val, val_type;
      val_type = this.limit_to_list();
      if (val_type) {
        val = (val_type === 'case_sensitive' && value) || this.lower_case(value);
        if (!root._(this._validation_options()).contains(val)) {
          return errors.add('property', this.name(), 'is not a valid option');
        }
      }
    };

    select.prototype.lower_case = function(value) {
      if (value.toLowerCase) {
        return value.toLowerCase();
      } else {
        return value;
      }
    };

    return select;

  })(xn.meta.type.text);

  xn.meta.type.numeric = (function(_super) {

    __extends(numeric, _super);

    function numeric() {
      return numeric.__super__.constructor.apply(this, arguments);
    }

    numeric.prototype.coerce = function() {
      return this._meta.coerce;
    };

    numeric.prototype.coerce_value = function(value) {
      var v;
      switch (this.coerce()) {
        case 'int':
        case 'float':
          v = (this.coerce() === 'int' && parseInt(value)) || parseFloat(value);
          if (isNaN(v)) {
            return void 0;
          } else {
            return v;
          }
          break;
        default:
          return value;
      }
    };

    numeric.prototype.validate = function(value, errors) {
      var coerced;
      coerced = this.coerce_value(value);
      numeric.__super__.validate.call(this, coerced, errors);
      if (!this.is_blank(coerced)) {
        return this._validate_in_range(coerced, errors);
      }
    };

    numeric.prototype._validate_in_range = function(value, errors) {
      var max, min;
      min = this.validations().min;
      max = this.validations().max;
      if (min && value < min) {
        errors.add('property', this.name(), "is less than " + min);
      }
      if (max && value > max) {
        return errors.add('property', this.name(), "is more than " + max);
      }
    };

    return numeric;

  })(xn.meta.type);

  xn.meta.type.number = xn.meta.type.numeric;

  xn.meta.type.date = (function(_super) {

    __extends(date, _super);

    function date() {
      return date.__super__.constructor.apply(this, arguments);
    }

    return date;

  })(xn.meta.type);

  xn.meta.type.boolean = (function(_super) {

    __extends(boolean, _super);

    function boolean() {
      return boolean.__super__.constructor.apply(this, arguments);
    }

    return boolean;

  })(xn.meta.type);

  xn.meta.type.ipv4 = (function(_super) {

    __extends(ipv4, _super);

    function ipv4() {
      return ipv4.__super__.constructor.apply(this, arguments);
    }

    return ipv4;

  })(xn.meta.type);

  xn.meta.type.regex = (function(_super) {

    __extends(regex, _super);

    function regex() {
      return regex.__super__.constructor.apply(this, arguments);
    }

    return regex;

  })(xn.meta.type.text);

  xn.meta.type.vertex = (function(_super) {

    __extends(vertex, _super);

    function vertex() {
      return vertex.__super__.constructor.apply(this, arguments);
    }

    return vertex;

  })(xn.meta.type);

}).call(this);
}, "xn/resource": function(exports, require, module) {(function() {
  var root, xn, _ref,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  xn = require('./root');

  root = typeof window !== "undefined" && window !== null ? window : exports;

  if ((_ref = root._) == null) {
    root._ = require('underscore');
  }

  xn.Resource = (function(_super) {

    __extends(Resource, _super);

    function Resource(based_on, url_suffix, query_string) {
      this.set_based_on(based_on);
      if (url_suffix) {
        this._suffix = url_suffix;
      }
      if (query_string) {
        this._suffix_qs = query_string;
      }
    }

    Resource.prototype.set_based_on = function(based_on) {
      this.based_on = based_on;
      return this.app = this.based_on.app;
    };

    Resource.prototype.set_result_type = function(_result_type) {
      this._result_type = _result_type;
      return this;
    };

    Resource.prototype.result_type = function() {
      return this._result_type;
    };

    Resource.prototype.set_suffix = function(_suffix, _suffix_qs) {
      this._suffix = _suffix;
      this._suffix_qs = _suffix_qs;
      return this;
    };

    Resource.prototype.set_type = function(_type) {
      this._type = _type;
      return this;
    };

    Resource.prototype.url_suffix = function() {
      return this._suffix;
    };

    Resource.prototype.url = function() {
      return root._([this.based_on.url(), this.url_suffix()]).compact().join('/');
    };

    Resource.prototype.query_string = function() {
      var qs_parts;
      qs_parts = root._([this.based_on.query_string(), this._suffix_qs]).compact();
      if (qs_parts.length > 0) {
        return qs_parts.join('&');
      }
    };

    Resource.prototype.type = function() {
      return this._result_type || this._type || this.based_on.type();
    };

    Resource.prototype.sequence = function() {
      return this.based_on.sequence();
    };

    return Resource;

  })(xn.meta.AbstractResource);

  xn.PathsResource = (function(_super) {

    __extends(PathsResource, _super);

    function PathsResource() {
      return PathsResource.__super__.constructor.apply(this, arguments);
    }

    PathsResource.prototype._path_result = function(callback) {
      var _this = this;
      return function(err, paths) {
        if (!callback) {

        } else if (err) {
          return callback(err, path);
        } else {
          return callback(null, _.map(paths, function(path) {
            return _.map(path, function(record) {
              var type;
              type = Xn.partial(record.meta.rendered);
              return type.instance(record.id, record);
            });
          }));
        }
      };
    };

    PathsResource.prototype.all = kew.magic(function(callback) {
      return this.get(this._path_result(callback));
    });

    return PathsResource;

  })(xn.Resource);

}).call(this);
}, "xn/root": function(exports, require, module) {(function() {

  module.exports = require('./_base');

}).call(this);
}, "xn/search": function(exports, require, module) {(function() {
  var root, xn, _ref,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  xn = require('./root');

  root = typeof window !== "undefined" && window !== null ? window : exports;

  if ((_ref = root._) == null) {
    root._ = require('underscore');
  }

  xn.Search = (function(_super) {

    __extends(Search, _super);

    function Search(based_on) {
      Search.__super__.constructor.call(this, based_on);
      this._filters = {};
    }

    Search.prototype.set_prefix = function(_prefix, _prefix_qs, type) {
      this._prefix = _prefix;
      this._prefix_qs = _prefix_qs;
      if (type) {
        this._as_type = type;
      }
      return this;
    };

    Search.prototype.filters = function() {
      var filter, name, _ref1, _results;
      _ref1 = this._filters;
      _results = [];
      for (name in _ref1) {
        filter = _ref1[name];
        _results.push(filter);
      }
      return _results;
    };

    Search.prototype.traversal = function() {
      return this._traversal;
    };

    Search.prototype.action = function() {
      return this._action;
    };

    Search.prototype.methods = function() {
      return root._(this.filters()).union(root._([this.action(), this.traversal()]).compact());
    };

    Search.prototype.set_as_type = function(_as_type) {
      this._as_type = _as_type;
      return this;
    };

    Search.prototype.set_ids = function(ids) {
      if (root._.isArray(ids)) {
        return this._ids = ids;
      } else {
        return this._ids = [ids];
      }
    };

    Search.prototype.ids = function() {
      return this._ids;
    };

    Search.prototype.parts = function(callback) {
      return this.internal_type().parts(callback);
    };

    Search.prototype.as_type = function() {
      return this._as_type;
    };

    Search.prototype.internal_type = function() {
      return this._as_type || this._type || this.based_on.type();
    };

    Search.prototype.load = function(callback) {
      return this.internal_type().metadata(callback);
    };

    Search.prototype.on_load = function(callback) {
      return this.internal_type().on_metadata(callback);
    };

    Search.prototype.ready = function(callback) {
      return this.on_load(function() {
        return root._.defer(callback);
      });
    };

    Search.prototype.type = function() {
      return this._result_type || this._as_type || this._type || this.based_on.type();
    };

    Search.prototype.set_filter = function(name, args, callback) {
      var _this = this;
      if (!(callback != null) && typeof args === 'function') {
        callback = args;
        args = {};
      }
      this.internal_type().metadata(function(err, md) {
        var _base, _ref1;
        if ((_ref1 = (_base = _this._filters)[name]) == null) {
          _base[name] = _this.internal_type().create_filter(name, args, _this.sequence().next());
        }
        if (callback) {
          return callback(err, _this._filters[name]);
        }
      });
      return this._filters[name];
    };

    Search.prototype.remove_filter = function(name) {
      return delete this._filters[name];
    };

    Search.prototype.filter = function(name) {
      return this._filters[name];
    };

    Search.prototype.available_filters = function(callback) {
      return this.internal_type().metadata(function(err, md) {
        var f, filters, name;
        if (!err) {
          filters = (function() {
            var _ref1, _results;
            _ref1 = md.filters;
            _results = [];
            for (name in _ref1) {
              f = _ref1[name];
              _results.push(name);
            }
            return _results;
          })();
        }
        return callback(err, filters);
      });
    };

    Search.prototype.set_action = function(name, args) {
      return this._action = this.internal_type().create_action(name, args, this.sequence().next());
    };

    Search.prototype.set_traversal = function(name, args) {
      return this._traversal = this.internal_type().create_traversal(name, args, this.sequence().next());
    };

    Search.prototype.url = function() {
      if (this.action()) {
        return root._([this.based_on.url(), this.url_prefix(), this.url_type(), this.url_ids(), this.url_filters(), this.url_action()]).compact().join('/');
      } else {
        return root._([this.based_on.url(), this.url_prefix(), this.url_type(), this.url_ids(), this.url_filters(), this.url_traversal(), this.url_suffix()]).compact().join('/');
      }
    };

    Search.prototype.query_string = function() {
      var qs_parts;
      qs_parts = root._([this.based_on.query_string(), this._prefix_qs, this._suffix_qs, this._methods_qs()]).compact();
      if (qs_parts.length > 0) {
        return qs_parts.join('&');
      }
    };

    Search.prototype._methods_qs = function() {
      var method, methods;
      methods = this.methods();
      if (methods.length > 0) {
        return root._((function() {
          var _i, _len, _results;
          _results = [];
          for (_i = 0, _len = methods.length; _i < _len; _i++) {
            method = methods[_i];
            _results.push(method.query_string());
          }
          return _results;
        })()).compact().join('&');
      }
    };

    Search.prototype.url_prefix = function() {
      return this._prefix;
    };

    Search.prototype.url_type = function() {
      if (this._as_type) {
        return this._as_type.url_fragment();
      }
    };

    Search.prototype.url_ids = function() {
      if (this._ids && this._ids.length > 0) {
        return "ids/" + (this._ids.join(','));
      }
    };

    Search.prototype.url_filters = function() {
      var filter, filter_names, filter_urls, name;
      if (this.filters()) {
        filter_urls = (function() {
          var _i, _len, _ref1, _results;
          _ref1 = this.filters();
          _results = [];
          for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
            filter = _ref1[_i];
            if (filter.has_value()) {
              _results.push(filter.url_fragment());
            }
          }
          return _results;
        }).call(this);
        filter_names = (function() {
          var _i, _len, _results;
          _results = [];
          for (_i = 0, _len = filter_urls.length; _i < _len; _i++) {
            name = filter_urls[_i];
            if (name != null) {
              _results.push(name);
            }
          }
          return _results;
        })();
        if (filter_names.length > 0) {
          return "filters/" + (filter_names.join(','));
        }
      }
    };

    Search.prototype.url_traversal = function() {
      if (this.traversal()) {
        return this.traversal().url_fragment();
      }
    };

    Search.prototype.url_action = function() {
      if (this.action()) {
        return this.action().url_fragment();
      }
    };

    Search.prototype.sequence = function() {
      var _ref1;
      return (_ref1 = this._sequence) != null ? _ref1 : this._sequence = this.based_on.sequence();
    };

    return Search;

  })(xn.Resource);

}).call(this);
}, "xn/support": function(exports, require, module) {(function() {
  var root, xn, _ref,
    __slice = [].slice;

  xn = require('./root');

  root = typeof window !== "undefined" && window !== null ? window : exports;

  if ((_ref = root._) == null) {
    root._ = require('underscore');
  }

  xn.support = {};

  xn.support.Errors = (function() {

    function Errors(errors) {
      this.clear();
      this.load(errors);
    }

    Errors.prototype.clear = function() {
      this.errors = {};
      return this.length = 0;
    };

    Errors.prototype.load = function(errors) {
      var message, name, type, _i, _len, _ref1, _results;
      if (errors) {
        _results = [];
        for (_i = 0, _len = errors.length; _i < _len; _i++) {
          _ref1 = errors[_i], type = _ref1[0], name = _ref1[1], message = _ref1[2];
          _results.push(this.add(type, name, message));
        }
        return _results;
      }
    };

    Errors.prototype.add = function(type, name, error) {
      var array, _base, _base1, _ref1, _ref2;
      if ((_ref1 = (_base = this.errors)[type]) == null) {
        _base[type] = {};
      }
      array = (_ref2 = (_base1 = this.errors[type])[name]) != null ? _ref2 : _base1[name] = [];
      if (array.indexOf(error) < 0) {
        array.push(error);
      }
      return this.length += 1;
    };

    Errors.prototype.to_a = function() {
      var error, errors, fields, list, name, type, _i, _len, _ref1;
      list = [];
      _ref1 = this.errors;
      for (type in _ref1) {
        fields = _ref1[type];
        for (name in fields) {
          errors = fields[name];
          for (_i = 0, _len = errors.length; _i < _len; _i++) {
            error = errors[_i];
            list.push([type, name, error]);
          }
        }
      }
      return list;
    };

    Errors.prototype.empty = function() {
      return this.length === 0;
    };

    return Errors;

  })();

  xn.support.Sequence = (function() {

    function Sequence() {
      this.current = 0;
    }

    Sequence.prototype.next = function() {
      return ++this.current;
    };

    return Sequence;

  })();

  xn.support.multi_sorter = function() {
    var sort_fns;
    sort_fns = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    return function(a, b) {
      var fn, order, _i, _len;
      for (_i = 0, _len = sort_fns.length; _i < _len; _i++) {
        fn = sort_fns[_i];
        if ((order = fn(a, b)) !== 0) {
          return order;
        }
      }
      return order;
    };
  };

  xn.support.natural_sorter = function(parser, splitter) {
    return function(a, b) {
      var na, nb, not_equal;
      a = splitter(a);
      b = splitter(b);
      not_equal = root._.find(root._.zip(a, b), function(_arg) {
        var _a, _b;
        _a = _arg[0], _b = _arg[1];
        return _a !== _b;
      });
      if (not_equal) {
        a = not_equal[0], b = not_equal[1];
        na = parser(a);
        if (isNaN(na)) {
          if (a < b) {
            return -1;
          } else {
            return 1;
          }
        } else {
          nb = parser(b);
          if (isNaN(nb)) {
            if (a < b) {
              return -1;
            } else {
              return 1;
            }
          } else {
            return na - nb;
          }
        }
      } else {
        return 0;
      }
    };
  };

  xn.support.natural_sort = xn.support.natural_sorter(parseInt, function(v) {
    return ("" + v).toLowerCase().split(/(\d+)/);
  });

  xn.support.naturalSort = xn.support.natural_sorter(parseInt, function(v) {
    return ("" + v).split(/(\d+)/);
  });

  xn.support.natural_sort_float = xn.support.natural_sorter(parseFloat, function(v) {
    return ("" + v).toLowerCase().split(/(-?[0-9]+(?:\.[0-9]+)?)/);
  });

}).call(this);
}, "xn/uri": function(exports, require, module) {(function() {
  var root, xn, _ref,
    __slice = [].slice;

  xn = require('./root');

  root = typeof window !== "undefined" && window !== null ? window : exports;

  if ((_ref = root._) == null) {
    root._ = require('underscore');
  }

  xn.Uri = (function() {

    function Uri(app, uri) {
      this.app = app;
      this.uri = uri;
      this._parse();
    }

    Uri.prototype.resource = function(app) {
      var base, first, groups, _ref1,
        _this = this;
      _ref1 = this.segment_groups(), first = _ref1[0], groups = 2 <= _ref1.length ? __slice.call(_ref1, 1) : [];
      base = this.build_base(first);
      if (groups.length) {
        return root._.reduce(groups, (function(based_on, group) {
          var search, segment, _i, _len;
          search = new xn.Search(based_on);
          for (_i = 0, _len = group.length; _i < _len; _i++) {
            segment = group[_i];
            search = _this._add_segment_to(search, segment);
          }
          return search;
        }), base);
      } else {
        return base.search();
      }
    };

    Uri.prototype.search = function(app) {
      var resource;
      resource = this.resource(app);
      if (resource.constructor === xn.Search) {
        return resource;
      } else {
        return resource.search();
      }
    };

    Uri.prototype.build_base = function(group) {
      var base, segment;
      segment = group[0];
      if (segment.type === 'model') {
        base = this.app.model(segment.name);
      } else if (segment.type === 'is') {
        base = this.app.partial(segment.name.split(','));
      } else {
        throw new Error("Unknown base resource " + segment.type + "/" + segment.name);
      }
      if (segment.ids != null) {
        return base.search(segment.ids);
      } else {
        return base;
      }
    };

    Uri.prototype._add_segment_to = function(search, segment) {
      var full_name, model, name, partial, parts, seq, _i, _len, _ref1, _ref2;
      switch (segment.type) {
        case 'filter':
        case 'filters':
          _ref1 = segment.name.split(',');
          for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
            full_name = _ref1[_i];
            _ref2 = full_name.split('~'), name = _ref2[0], seq = _ref2[1];
            search.set_filter(name, this.query[full_name]);
          }
          return search;
        case 'is':
          parts = segment.name.split(',');
          partial = this.app.partial(parts);
          search.set_prefix("is/" + segment.name, void 0, partial);
          return search;
        case 'model':
          model = this.app.model(segment.name);
          search.set_prefix("model/" + segment.name, void 0, model);
          return search;
        case 'relationship':
          return search.rel(segment.name);
        case 'rel':
        case 'to':
          return search[segment.type](segment.name);
        case 'first':
        case 'unique':
        case 'errors':
          return search[segment.type]();
      }
    };

    Uri.prototype.segment_groups = function() {
      var group, segment, state, _i, _len, _ref1;
      if (this.groups != null) {
        return this.groups;
      }
      this.groups = [];
      state = 10;
      _ref1 = this.segments();
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        segment = _ref1[_i];
        if (state > segment.state) {
          group = [segment];
          this.groups.push(group);
        } else {
          group.push(segment);
        }
        state = segment.state;
      }
      return this.groups;
    };

    Uri.prototype.segments = function() {
      var part;
      if (this._segments != null) {
        return this._segments;
      }
      part = this._next_segment(this.url, null);
      this._segments = [part];
      while (part.rest) {
        part = this._next_segment(part.rest, part);
        this._segments.push(part);
      }
      return this._segments;
    };

    Uri.prototype._next_segment = function(url, prev) {
      var name, part, rest, type;
      type = url[0], name = url[1], rest = 3 <= url.length ? __slice.call(url, 2) : [];
      part = {
        state: this._segment_state(type, prev),
        prev: prev,
        type: type,
        name: name,
        query: this.query[name]
      };
      if (rest[0]) {
        if (this._segment_state(rest[0], prev)) {
          part.rest = rest;
        } else {
          part.ids = rest[0].split(',');
          rest.splice(0, 1);
          part.rest = rest;
        }
      }
      return part;
    };

    Uri.prototype._qs_regex = /(\w+~\d+)\[(\w+)\]=(.*)/;

    Uri.prototype._parse = function() {
      var filter_name, filter_qs, ignore, param, part, parts, url, value, _base, _i, _len, _ref1, _ref2, _results;
      parts = this.uri.split('?');
      url = parts.splice(0, 1)[0];
      this.query = {};
      this.url = (function() {
        var _i, _len, _ref1, _results;
        _ref1 = url.split('/');
        _results = [];
        for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
          part = _ref1[_i];
          if (part && part !== '') {
            _results.push(part);
          }
        }
        return _results;
      })();
      _results = [];
      for (_i = 0, _len = parts.length; _i < _len; _i++) {
        part = parts[_i];
        if (this._qs_regex.test(part)) {
          _ref1 = this._qs_regex.exec(part), ignore = _ref1[0], filter_name = _ref1[1], param = _ref1[2], value = _ref1[3];
          filter_qs = (_ref2 = (_base = this.query)[filter_name]) != null ? _ref2 : _base[filter_name] = {};
          _results.push(filter_qs[param] = decodeURIComponent(value));
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    };

    Uri.prototype._segment_state = function(fragment, prev) {
      switch (fragment) {
        case 'filters':
        case 'filter':
          return 1;
        case 'is':
        case 'model':
          if (prev) {
            return 2;
          } else {
            return 5;
          }
          break;
        case 'relationship':
        case 'rel':
        case 'to':
        case 'traversal':
          return 3;
        case 'first':
        case 'unique':
          if (prev.state > 1 && prev.state < 5) {
            return prev.state;
          } else {
            return 2;
          }
          break;
        case 'property':
        case 'properties':
        case 'job':
        case 'action':
        case 'metadata':
        case 'errors':
        case 'count':
          return 4;
      }
    };

    return Uri;

  })();

}).call(this);
}, "fe": function(exports, require, module) {(function() {

  module.exports = require('./fe/root');

  window.Filter = {};

  window.Workflow = {};

  require('./fe/main');

  require('./fe/models/commonality');

  require('./fe/models/notifications');

  require('./fe/util/template/dust_filters');

  require('./fe/util/template/results_helper');

  require('./fe/util/template/template_helpers');

  require('./fe/util/core_ext');

  require('./fe/util/inflections');

  require('./fe/util/jquery_plugins');

  require('./fe/util/patterns');

  require('./fe/util/t');

  require('./fe/util/underscore_plugins');

  require('./fe/service/print_service');

  require('./fe/controllers/workflow/module');

  require('./fe/controllers/base_controller');

  require('./fe/controllers/filter/base');

  require('./fe/controllers/filter/boolean');

  require('./fe/controllers/filter/date');

  require('./fe/controllers/filter/range');

  require('./fe/controllers/filter/related');

  require('./fe/controllers/filter/select');

  require('./fe/controllers/filter/text');

  require('./fe/controllers/workflow/state_machine');

  require('./fe/controllers/workflow');

  require('./fe/controllers/workflow/type');

  require('./fe/controllers/workflow/rel');

  require('./fe/controllers/workflow/rel/record');

  require('./fe/controllers/workflow/rel/one');

  require('./fe/controllers/workflow/rel/many');

  require('./fe/controllers/workflow/text');

  require('./fe/controllers/workflow/subnets');

  require('./fe/controllers/workflow/table');

  require('./fe/controllers/workflow/table_row');

  require('./fe/controllers/workflow/map');

  require('./fe/controllers/action_bar');

  require('./fe/controllers/filter_bar');

  require('./fe/controllers/filter_part');

  require('./fe/controllers/filter_types');

  require('./fe/controllers/login');

  require('./fe/controllers/model');

  require('./fe/controllers/model_actions');

  require('./fe/controllers/model_clone');

  require('./fe/controllers/model_history');

  require('./fe/controllers/report_page');

  require('./fe/controllers/report/blueprint');

  require('./fe/controllers/report/table_of_contents');

  require('./fe/controllers/new_model');

  require('./fe/controllers/new_related_model');

  require('./fe/controllers/model_part');

  require('./fe/controllers/notes');

  require('./fe/controllers/action');

  require('./fe/controllers/popover');

  require('./fe/controllers/result');

  require('./fe/controllers/no_results');

  require('./fe/controllers/search');

  require('./fe/controllers/search_panel');

  require('./fe/controllers/search_results');

  require('./fe/controllers/wf_notice');

  require('./fe/controllers/wf_topbar');

  require('./fe/controllers/menu');

  require('./fe/controllers/notifications');

  require('./fe/controllers/action/code_strings_result');

  require('./fe/ipam/d3_controller');

  require('./fe/ipam/ipam');

  require('./fe/ipam/attach_subnets');

  require('./fe/ipam/subnet_tree');

  require('./fe/ipam/subnet_scale');

  require('./fe/controllers/visualize');

  require('./fe/visualizations/packed_circles');

  require('./fe/visualizations/partitioned');

}).call(this);
}, "fe/_base": function(exports, require, module) {(function() {

  module.exports = {
    version: 1
  };

}).call(this);
}, "fe/controllers/action": function(exports, require, module) {(function() {
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  window.Action = (function(_super) {

    __extends(Action, _super);

    Action.create_actions = function(controller, el_actions, metadata, resource, callback) {
      var el_action, _i, _len, _results;
      _results = [];
      for (_i = 0, _len = el_actions.length; _i < _len; _i++) {
        el_action = el_actions[_i];
        _results.push(this._add_action(controller, el_action, metadata, resource, callback));
      }
      return _results;
    };

    Action._add_action = function(controller, el, metadata, resource, callback) {
      var action, meta, name;
      name = $(el).data('method-name');
      meta = metadata.methods[name];
      if (meta) {
        action = new Action({
          el: el,
          name: name,
          meta: meta,
          workflow: controller,
          resource: resource
        });
        if (callback) {
          callback(name, action);
        }
        return action;
      } else {
        $(el).remove();
        return null;
      }
    };

    Action.resource_type = function(type) {
      switch (type) {
        case 'route_traversal':
          return 'to';
        default:
          return type;
      }
    };

    Action.prototype.events = {
      'click .run-action': '_on_click',
      'click .show-last': '_show_last_results'
    };

    Action.prototype.elements = {
      '.run-action': 'el_run_btn',
      '.show-last': 'el_show_last_result',
      'form.dv-action-args': 'el_arguments_template'
    };

    function Action() {
      this._show_last_results = __bind(this._show_last_results, this);

      this._action_performed = __bind(this._action_performed, this);

      this._args_form_submitted = __bind(this._args_form_submitted, this);

      var _this = this;
      Action.__super__.constructor.apply(this, arguments);
      this.el_show_last_result.tooltip();
      this.attr('metadata', this._argument_model_metadata());
      this.el_arguments_template.remove();
      this.release(function() {
        var _ref, _ref1, _ref2, _ref3;
        if ((_ref = _this._result_controller) != null) {
          _ref.release();
        }
        if ((_ref1 = _this._results_popover) != null) {
          _ref1.release();
        }
        if ((_ref2 = _this._args_controller) != null) {
          _ref2.release();
        }
        if ((_ref3 = _this._args_popover) != null) {
          _ref3.release();
        }
        return _this.el_show_last_result.tooltip('destroy');
      });
    }

    Action.prototype.instance = function() {
      return this.attr('resource');
    };

    Action.prototype._argument_model_metadata = function() {
      return {
        properties: this.options.meta["arguments"]
      };
    };

    Action.prototype.human_method_name = function() {
      return this.el_run_btn.text().trim();
    };

    Action.prototype.method_name = function() {
      return this.el.data('method-name');
    };

    Action.prototype.method_type = function() {
      return this.el.data('method-type');
    };

    Action.prototype.fires_reload_event = function() {
      return this.el.data('reload-instance') != null;
    };

    Action.prototype.result_controller_name = function() {
      return this.el.data('result-controller');
    };

    Action.prototype.result_controller_class = function() {
      return window[this.result_controller_name()];
    };

    Action.prototype.request_confirmation = function() {
      if (this._has_args()) {
        return true;
      }
      switch (this.method_type()) {
        case 'action':
        case 'job':
          return confirm("Are you sure you'd like to run the " + (this.human_method_name()) + " " + (this.method_type()) + "?");
        default:
          return true;
      }
    };

    Action.prototype.show_job_in_new_window = function() {
      return false;
    };

    Action.prototype._has_args = function() {
      return !!this.el_arguments_template.find('.dv-property').length;
    };

    Action.prototype._on_click = function(e) {
      if (this._is_running()) {
        return;
      }
      if (this._just_hide_visible_popovers()) {
        return;
      }
      if (this._has_args()) {
        return this._show_arguments_form();
      } else {
        return this._invoke();
      }
    };

    Action.prototype._argument_form_id = function() {
      return this.el_arguments_template.attr('id');
    };

    Action.prototype._show_arguments_form = function() {
      var _ref;
      if ((_ref = this._args_controller) != null) {
        _ref.workflow(null);
      }
      this._args_instance = new xn.instance.Record(Xn);
      this.attr('instance', this._args_instance);
      this._build_args_controller();
      this._build_args_popover();
      return this._args_popover.show().focus_first_input();
    };

    Action.prototype._build_args_controller = function() {
      var _ref;
      this.el_arguments = this.el_arguments_template.clone().show();
      this.el_arguments.submit(this._args_form_submitted);
      if ((_ref = this._args_controller) != null) {
        _ref.release();
      }
      return this._args_controller = new ModelPart({
        el: this.el_arguments,
        className: ''
      }).attr('part', this._argument_form_id()).state('Edit').workflow(this).non_explicit_elements().render();
    };

    Action.prototype._build_args_popover = function() {
      var _ref,
        _this = this;
      if ((_ref = this._args_popover) != null) {
        _ref.release();
      }
      return this._args_popover = new Popover({
        title: "" + (this.human_method_name()),
        anchor: this.el_run_btn,
        controller: this._args_controller,
        layout_class: 'popover-action-args',
        side: 'bottom-left',
        buttons: [
          {
            label: 'Run',
            form: this._argument_form_id(),
            "class": 'btn-primary btn-small'
          }, {
            label: 'Cancel',
            event: 'hide',
            "class": 'btn-small'
          }
        ],
        should_click_dismiss: function(e) {
          return !_this.is_descendant($(e.target));
        }
      });
    };

    Action.prototype._args_form_submitted = function() {
      try {
        this._invoke(this._args_instance.toJSON());
      } catch (e) {
        console.error(e.message, e.stack);
      }
      return false;
    };

    Action.prototype._invoke = function(args) {
      if (!this.request_confirmation()) {
        return;
      }
      switch (this.method_type()) {
        case 'action':
        case 'job':
        case 'report':
          return this._call_action(args);
        case 'route_traversal':
        case 'traversal':
          return this._launch_traversal(args);
      }
    };

    Action.prototype._call_action = function(args) {
      var action_part, type;
      if (args == null) {
        args = {};
      }
      this._set_is_running(true);
      type = Action.resource_type(this.method_type());
      action_part = this.attr('meta').part;
      return this.instance()[type](this.method_name(), args, this._action_performed);
    };

    Action.prototype._launch_traversal = function(args) {
      var instance_method;
      if (args == null) {
        args = {};
      }
      instance_method = Action.resource_type(this.method_type());
      return window.open("" + (this.instance().xnid()) + "/" + instance_method + "/" + (this.method_name()) + "?" + ($.param(args)));
    };

    Action.prototype._action_performed = function(error, results, data) {
      var error_info, _ref, _ref1;
      this._set_is_running(false);
      if (error) {
        error_info = JSON.parse(results.responseText);
        if (error_info.response === 'validation_errors' && this._args_controller) {
          this._args_controller.apply_validations(error_info.errors);
          if ((_ref = this._args_popover) != null) {
            _ref.show().focus_first_error();
          }
        } else {
          notifications.add_notification(error_info.message, 'danger');
        }
        return;
      }
      if ((_ref1 = this._args_popover) != null) {
        _ref1.disable_buttons(false).hide();
      }
      if (this.fires_reload_event()) {
        this.el.trigger('reload');
      }
      if (this._is_job_response(results)) {
        return this._job_performed(results[0]);
      } else if (this._is_renderable_response(results)) {
        return this._render_response(results);
      }
    };

    Action.prototype._is_renderable_response = function(results) {
      return results.length !== 0;
    };

    Action.prototype._render_response = function(results) {
      var _ref, _ref1,
        _this = this;
      if (!this.result_controller_name()) {
        console.warn('Not rendering action results. No controller specified');
        return;
      } else if (!this.result_controller_class()) {
        console.warn("No controller class found", this.result_controller_name());
        return;
      }
      if ((_ref = this._result_controller) != null) {
        _ref.release();
      }
      if ((_ref1 = this._results_popover) != null) {
        _ref1.release();
      }
      this._result_controller = new (this.result_controller_class())({
        results: results
      }).render();
      this._results_popover = new Popover({
        title: "" + (this.human_method_name()) + " Results",
        anchor: this.el_run_btn,
        controller: this._result_controller,
        layout_class: 'popover-action-result',
        side: 'bottom-left',
        should_click_dismiss: function(e) {
          return !_this.is_descendant($(e.target));
        }
      });
      this._results_popover.show();
      return this.el_show_last_result.removeAttr('disabled');
    };

    Action.prototype._show_last_results = function() {
      return this._results_popover.show();
    };

    Action.prototype._is_job_response = function(results) {
      return results[0] instanceof xn.instance.Record && _.contains(results[0].type().parts(), 'job');
    };

    Action.prototype._job_performed = function(job) {
      notifications.add_job_notification(job, this.human_method_name());
      if (this.show_job_in_new_window()) {
        return window.open(job.xnid());
      }
    };

    Action.prototype._just_hide_visible_popovers = function() {
      var _ref, _ref1, _ref2, _ref3;
      if (((_ref = this._args_popover) != null ? _ref.visible : void 0) || ((_ref1 = this._results_popover) != null ? _ref1.visible : void 0)) {
        if ((_ref2 = this._args_popover) != null) {
          _ref2.hide();
        }
        if ((_ref3 = this._results_popover) != null) {
          _ref3.hide();
        }
        return true;
      } else {
        return false;
      }
    };

    Action.prototype._is_running = function() {
      return this.el_run_btn.hasClass('btn-running');
    };

    Action.prototype._set_is_running = function(running) {
      this.el_run_btn.toggleClass('btn-running', running);
      if (this._args_controller) {
        this._args_controller.clear_validations();
        return this._args_popover.disable_buttons(running);
      }
    };

    return Action;

  })(BaseController);

}).call(this);
}, "fe/controllers/action/code_strings_result": function(exports, require, module) {(function() {
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  window.CodeStringsResult = (function(_super) {

    __extends(CodeStringsResult, _super);

    CodeStringsResult.prototype.className = 'action-result';

    CodeStringsResult.prototype.elements = {
      '.btn-copy': 'el_copy',
      '> pre': 'el_code'
    };

    function CodeStringsResult(_arg) {
      var _this = this;
      this.results = _arg.results;
      this._render = __bind(this._render, this);

      CodeStringsResult.__super__.constructor.apply(this, arguments);
      this.on_render(this._render);
      this.release(function() {
        return _this.clip.unglue(_this.el_copy);
      });
    }

    CodeStringsResult.prototype.template = function() {
      return 'action/result/code_strings';
    };

    CodeStringsResult.prototype.dust_data = function() {
      return {
        results: this.results
      };
    };

    CodeStringsResult.prototype.dust_context = function() {
      return this.attr('dust_base').push(this.dust_data());
    };

    CodeStringsResult.prototype._render = function() {
      var _this = this;
      return dust.render(this.template(), this.dust_context(), function(err, html) {
        if (err) {
          return _this.error(err);
        } else {
          return _this.html(html);
        }
      });
    };

    CodeStringsResult.prototype.added_to_window = function() {
      return this._init_copy();
    };

    CodeStringsResult.prototype._init_copy = function() {
      var _this = this;
      this.clip = new ZeroClipboard(this.el_copy);
      this.clip.on('noflash', function() {
        return _this.el_copy.hide();
      });
      this.clip.on('wrongflash', function() {
        return _this.el_copy.hide();
      });
      this.clip.on('mouseover', function() {
        return _this.el_copy.addClass('hover');
      });
      this.clip.on('mouseout', function() {
        return _this.el_copy.removeClass('hover');
      });
      this.clip.on('mousedown', function() {
        return _this.el_copy.addClass('active');
      });
      this.clip.on('mouseup', function() {
        return _this.el_copy.removeClass('active');
      });
      this.clip.on('dataRequested', function() {
        return _this.clip.setText(_this.el_code.text());
      });
      return this.clip.on('complete', function() {
        _this.el_copy.tooltip({
          html: true,
          title: 'Code copied to clipboard',
          trigger: 'manual'
        });
        _this.el_copy.tooltip('show');
        return _.delay((function() {
          return _this.el_copy.tooltip('destroy');
        }), 2000);
      });
    };

    return CodeStringsResult;

  })(BaseController);

}).call(this);
}, "fe/controllers/action_bar": function(exports, require, module) {(function() {
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  window.ActionBar = (function(_super) {

    __extends(ActionBar, _super);

    ActionBar.include(BasicWorkflow);

    function ActionBar() {
      this._click_select_all = __bind(this._click_select_all, this);

      this._click_next = __bind(this._click_next, this);

      this._click_prev = __bind(this._click_prev, this);

      this._click_select_none = __bind(this._click_select_none, this);

      this._click_to = __bind(this._click_to, this);

      this._click_rel = __bind(this._click_rel, this);

      this.deselect = __bind(this.deselect, this);

      this.select = __bind(this.select, this);
      ActionBar.__super__.constructor.apply(this, arguments);
      this._commonality = new Commonality;
      this.selected = [];
      this.count = 0;
      this.offset = 0;
      this.limit = 100;
      this._action_controllers = [];
      this._render_layout();
    }

    ActionBar.prototype.className = 'action-bar scrollable';

    ActionBar.prototype.elements = {
      '.action-bar-groups': 'el_groups',
      '[data-method-name]': 'el_actions',
      '[data-value=result_count]': 'el_result_count',
      '[data-value=total_count]': 'el_total_count'
    };

    ActionBar.prototype.events = {
      'click [data-rel]': '_click_rel',
      'click [data-to]': '_click_to',
      'click [data-function=get-count]': 'get_count',
      'click [data-function=prev]': '_click_prev',
      'click [data-function=next]': '_click_next',
      'click [data-function=select-none]': '_click_select_none',
      'click [data-function=select-all]': '_click_select_all'
    };

    ActionBar.prototype.set_base_parts = function(base_parts) {
      this.base_parts = base_parts;
      this._commonality.set_base_parts(this.base_parts);
      return this._render_internals();
    };

    ActionBar.prototype.is_selected = function(instance) {
      return this.selected.some(function(sel) {
        return sel.xnid() === instance.xnid();
      });
    };

    ActionBar.prototype.find_selected = function(instance) {
      var result, xnid, _i, _len, _ref;
      xnid = instance.xnid();
      _ref = this.selected;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        result = _ref[_i];
        if (result.xnid() === xnid) {
          return result;
        }
      }
    };

    ActionBar.prototype.select = function(instance, event) {
      if (event == null) {
        event = true;
      }
      if (!this.is_selected(instance)) {
        this.count++;
        if (event) {
          this.trigger('select', instance);
        }
        this.selected.push(instance);
        this._commonality.add_instance(instance);
      }
      return this._render_internals();
    };

    ActionBar.prototype.deselect = function(instance, event) {
      var result, xnid;
      if (event == null) {
        event = true;
      }
      result = this.find_selected(instance);
      if (result) {
        this.count--;
        if (event) {
          this.trigger('deselect', instance);
        }
        this._commonality.remove_instance(instance);
        xnid = instance.xnid();
        this.selected = this.selected.filter(function(sel) {
          return sel.xnid() !== xnid;
        });
      }
      return this._render_internals();
    };

    ActionBar.prototype.select_none = function() {
      if (this.count > 0) {
        this.count = 0;
        this._commonality = new Commonality(this.base_parts);
        this.selected = [];
        return this._render_internals();
      }
    };

    ActionBar.prototype.select_all = function(insts) {
      this._commonality = new Commonality(this.base_parts);
      this.selected = insts;
      insts.forEach(this._commonality.add_instance);
      this.count = insts.length;
      return this._render_internals();
    };

    ActionBar.prototype.empty_page = function() {
      this.offset -= this.limit;
      if (this.offset < 0) {
        this.offset = 0;
      }
      return this.set_total_count(this.result_count);
    };

    ActionBar.prototype.set_result_count = function(result_count) {
      this.result_count = result_count;
      if (this.result_count < this.limit) {
        this.set_total_count(this.offset + this.result_count);
        if (this.result_count === 0) {
          if (this.offset === 0) {
            this.el_result_count.text('0');
          } else {
            this.el_result_count.text('Past end');
          }
        }
      }
      if (this.offset === 0) {
        this.el_result_count.text(this.result_count);
      } else {
        this.el_result_count.text("" + (this.offset + 1) + ":" + (this.offset + this.result_count));
      }
      if (this.total_count == null) {
        return this.set_total_count();
      }
    };

    ActionBar.prototype.get_count = function(event) {
      if (event != null) {
        event.preventDefault();
      }
      return this.trigger('get_count');
    };

    ActionBar.prototype.set_total_count = function(total_count) {
      this.total_count = total_count;
      if (this.total_count != null) {
        return this.el_total_count.text(' of ' + this.total_count);
      } else {
        return this.el_total_count.html('of &hellip;');
      }
    };

    ActionBar.prototype.partial = function(callback) {
      return this._commonality.partial(callback);
    };

    ActionBar.prototype.selected_ids = function() {
      return this.selected.map(function(sel) {
        return sel.id();
      });
    };

    ActionBar.prototype._click_rel = function(event) {
      var _this = this;
      return this._click_subsearch('rel', event, function(partial, name) {
        return partial.relationship(name);
      });
    };

    ActionBar.prototype._click_to = function(event) {
      var _this = this;
      return this._click_subsearch('to', event, function(partial, name) {
        return partial.to(name);
      });
    };

    ActionBar.prototype._click_select_none = function(event) {
      event.preventDefault();
      if (this.count > 0) {
        return this.trigger('select_none');
      }
    };

    ActionBar.prototype._click_prev = function(event) {
      event.preventDefault();
      if (this.offset > 0) {
        if (this.offset > 0) {
          this.offset -= this.limit;
        }
        if (this.offset < 0) {
          this.offset = 0;
        }
        return this.trigger('offset', this.offset);
      }
    };

    ActionBar.prototype._click_next = function(event) {
      event.preventDefault();
      if (!this.total_count || this.offset + this.limit < this.total_count) {
        this.offset += this.limit;
        return this.trigger('offset', this.offset);
      }
    };

    ActionBar.prototype._click_select_all = function(event) {
      event.preventDefault();
      return this.trigger('select_all');
    };

    ActionBar.prototype._click_subsearch = function(type, event, callback) {
      var el, name, selected,
        _this = this;
      event.preventDefault();
      el = $(event.currentTarget);
      selected = this.$('.selected');
      name = el.data(type);
      selected.removeClass('selected');
      if (selected[0] === el[0]) {
        return this.trigger('close');
      } else {
        el.addClass('selected');
        return this.partial(function(err, partial) {
          if (err) {
            return _this.trigger('error', err);
          } else {
            return _this.trigger(type, callback(partial, name), el);
          }
        });
      }
    };

    ActionBar.prototype.context = function() {
      var _ref;
      if ((_ref = this._context) == null) {
        this._context = TemplateHelpers.make();
      }
      return this._context.push({
        count: (this.count ? this.count : void 0),
        r_size: this.size
      });
    };

    ActionBar.prototype._render_layout = function() {
      var _this = this;
      return dust.render('action/action_bar', this.context(), function(err, html) {
        if (err) {
          return _this.trigger('error', err);
        } else {
          _this.html(html);
          return _this._render_internals();
        }
      });
    };

    ActionBar.prototype._render_internals = function() {
      var _this = this;
      return this.partial(function(err, partial) {
        var context, from_rels, jobs, queries, to_rels;
        if (err) {
          _this.trigger('error', err);
          return;
        }
        context = _this.context();
        if (partial) {
          to_rels = partial.to_relationships().map(function(r) {
            return {
              name: r.name,
              label: r.name
            };
          });
          from_rels = partial.from_relationships().map(function(r) {
            return {
              name: r.name,
              label: r.name
            };
          });
          queries = partial.traversals().map(function(name) {
            return {
              name: name,
              label: name
            };
          });
          if (_this.selected.length === 0) {
            jobs = [];
          } else {
            jobs = partial.jobs().map(function(job) {
              return {
                name: job.name,
                label: job.name
              };
            });
          }
        } else {
          from_rels = to_rels = [];
        }
        context = context.push({
          models: _this._commonality.model_counts(),
          jobs: jobs,
          to_rels: to_rels,
          from_rels: from_rels,
          queries: queries
        });
        return dust.render('action/bar/groups', context, function(err, html) {
          var action, meta, _, _i, _len, _ref, _ref1;
          if (err) {
            return _this.trigger('error', err);
          } else {
            _this.el_groups.html(html);
            if (partial) {
              _this.refreshElements();
              _ref = partial.metadata(), _ = _ref[0], meta = _ref[1];
              _ref1 = _this._action_controllers;
              for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
                action = _ref1[_i];
                if (action != null) {
                  action.release();
                }
              }
              return _this._action_controllers = Action.create_actions(_this, _this.el_actions, meta, _this.attr('resource'));
            }
          }
        });
      });
    };

    return ActionBar;

  })(BaseController);

}).call(this);
}, "fe/controllers/base_controller": function(exports, require, module) {(function() {
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  window.BaseController = (function(_super) {

    __extends(BaseController, _super);

    BaseController.include(BasicWorkflow);

    function BaseController(options) {
      if (options == null) {
        options = {};
      }
      this.release_binds = __bind(this.release_binds, this);

      this.hide = __bind(this.hide, this);

      this.show = __bind(this.show, this);

      this.print_element = __bind(this.print_element, this);

      this._first_focus_candidates = __bind(this._first_focus_candidates, this);

      this.focus_first_input = __bind(this.focus_first_input, this);

      this.focus_first_error = __bind(this.focus_first_error, this);

      this.focus = __bind(this.focus, this);

      BaseController.__super__.constructor.call(this, options);
      this._init_workflow();
      this.attr('dust_base', this.dust_base);
      this.attr('print_element', this.print_element);
      this.release(this.release_binds);
    }

    BaseController.prototype.is_root = function() {
      return window.main.current === this;
    };

    BaseController.prototype.is_descendant = function(element, container) {
      if (container == null) {
        container = this.el;
      }
      return container.find(element).length !== 0;
    };

    BaseController.prototype.dust_base = function() {
      return TemplateHelpers.make();
    };

    BaseController.prototype.added_to_window = function() {};

    BaseController.prototype.focus = function() {
      this.focus_first_input();
      return this;
    };

    BaseController.prototype.focus_first_error = function() {
      return this.$('.error select:first, .error input:first, .error .focusable:first').first().focus();
    };

    BaseController.prototype.focus_first_input = function() {
      return this._first_focus_candidates().first().focus();
    };

    BaseController.prototype._first_focus_candidates = function() {
      return this.$('[autofocus]:first').add(this.$('select:first, input:first, .focusable:first'));
    };

    BaseController.prototype.print = function(options) {
      if (options == null) {
        options = {};
      }
      return window.PrintService.print(_.extend({
        controller: this
      }, options));
    };

    BaseController.prototype.print_element = function() {
      return this.el;
    };

    BaseController.prototype.show = function() {
      return this.el.show();
    };

    BaseController.prototype.hide = function() {
      return this.el.hide();
    };

    BaseController.prototype.releasing_bind = function(target, ev, callback) {
      this.releasing_binds || (this.releasing_binds = []);
      this.releasing_binds.push({
        target: target,
        ev: ev,
        callback: callback
      });
      return target.bind(ev, callback);
    };

    BaseController.prototype.release_binds = function() {
      var callback, ev, target, _i, _len, _ref, _ref1, _results;
      if (!this.releasing_binds) {
        return;
      }
      _ref = this.releasing_binds;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        _ref1 = _ref[_i], target = _ref1.target, ev = _ref1.ev, callback = _ref1.callback;
        _results.push(target.unbind(ev, callback));
      }
      return _results;
    };

    BaseController.prototype.refreshElements = function() {
      if (_.isFunction(this.elements)) {
        this.elements = this.elements();
      }
      return BaseController.__super__.refreshElements.apply(this, arguments);
    };

    BaseController.prototype.delegateEvents = function() {
      if (_.isFunction(this.events)) {
        this.events = this.events();
      }
      return BaseController.__super__.delegateEvents.apply(this, arguments);
    };

    BaseController.prototype._is_retina = function() {
      var mediaQuery;
      mediaQuery = "(-webkit-min-device-pixel-ratio: 1.5),                     (min--moz-device-pixel-ratio: 1.5),                       (-o-min-device-pixel-ratio: 3/2),                                  (min-resolution: 1.5dppx)";
      if (window.devicePixelRatio > 1) {
        return true;
      } else if (window.matchMedia && window.matchMedia(mediaQuery).matches) {
        return true;
      } else {
        return false;
      }
    };

    return BaseController;

  })(Spine.Controller);

}).call(this);
}, "fe/controllers/filter/base": function(exports, require, module) {(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Filter.Base = (function(_super) {

    __extends(Base, _super);

    function Base() {
      Base.__super__.constructor.apply(this, arguments);
      this.metadata = this.options.metadata;
      this.resource = this.options.resource;
      this.name = this.options.name;
      this.release(function() {
        return this.trigger('clear', this, this.name);
      });
    }

    Base.prototype.render = function(context) {
      var _this = this;
      if (!dust.cache[this.template]) {
        this.trigger('remove', this, this.name);
        this.release();
      }
      dust.render(this.template, this.context(context), function(err, html) {
        if (err) {
          return _this.trigger('error', err);
        } else {
          _this.append(html);
          return _this.trigger('rendered');
        }
      });
      return this;
    };

    Base.prototype.bind_to_panel = function(panel) {
      this.bind('set', function(f, name, args) {
        return panel.set_filter(name, args);
      });
      this.bind('clear', function(f, name) {
        return panel.remove_filter(name);
      });
      this.bind('update', function() {
        return panel.update();
      });
      return this;
    };

    Base.prototype.label = function() {
      return this.options.label || this.$('label').text() || this.name;
    };

    Base.prototype.context = function(context) {
      var ctxt;
      if (context == null) {
        context = this.attr('dust_base');
      }
      return ctxt = context.push(this.metadata).push({
        name: this.name
      });
    };

    Base.prototype.events = function(more) {
      if (more == null) {
        more = {};
      }
      return $.extend({}, more);
    };

    Base.prototype.get = function(name) {
      return this["el_" + name].val();
    };

    Base.prototype.format = function(name) {
      return this.get(name);
    };

    Base.prototype._update_field = function(name) {
      var _this = this;
      return function() {
        var v;
        v = _this.get(name);
        if (v === _this[name]) {
          return;
        }
        if (v) {
          _this[name] = v;
        } else {
          _this[name] = void 0;
        }
        _this["_trigger_" + name]();
        return _this._update();
      };
    };

    Base.prototype._update = function() {
      return this.trigger('update');
    };

    Base.prototype._trigger_value = function() {
      var opts;
      if (this.value != null) {
        opts = {};
        if (this.regex) {
          opts.regex = this.value;
        } else {
          opts.value = this.value;
        }
        if (this.negate) {
          opts.negate = true;
        }
        this.filter = opts;
        return this.trigger('set', this, this.name, opts);
      }
      this.filter = void 0;
      return this.trigger('clear', this, this.name);
    };

    Base.prototype._trigger_min = function() {
      return this._trigger_max();
    };

    Base.prototype._trigger_max = function() {
      var opts;
      if ((this.min != null) || (this.max != null)) {
        opts = {};
        if (this.min != null) {
          opts.min = this.min;
        }
        if (this.max != null) {
          opts.max = this.max;
        }
        if (this.negate) {
          opts.negate = true;
        }
        this.filter = opts;
        return this.trigger('set', this, this.name, opts);
      }
      this.filter = void 0;
      return this.trigger('clear', this, this.name);
    };

    return Base;

  })(BaseController);

}).call(this);
}, "fe/controllers/filter/boolean": function(exports, require, module) {(function() {
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Filter.boolean = (function(_super) {

    __extends(boolean, _super);

    function boolean() {
      this._key_pressed = __bind(this._key_pressed, this);

      this._click_no = __bind(this._click_no, this);

      this._click_yes = __bind(this._click_yes, this);
      return boolean.__super__.constructor.apply(this, arguments);
    }

    boolean.prototype.template = 'filter/boolean';

    boolean.prototype.elements = {
      '[data-value=yes]': 'el_yes',
      '[data-value=no]': 'el_no'
    };

    boolean.prototype.events = function() {
      return boolean.__super__.events.call(this, {
        'click [data-value=yes]': this._click_yes,
        'click [data-value=no]': this._click_no,
        'keypress [data-value]': this._key_pressed
      });
    };

    boolean.prototype.toggle_value = function(value) {
      if (this.value === value) {
        this.value = void 0;
      } else {
        this.value = value;
      }
      this._set_active();
      return this._trigger_value();
    };

    boolean.prototype._click_yes = function() {
      this.toggle_value(true);
      return this._update();
    };

    boolean.prototype._click_no = function() {
      this.toggle_value(false);
      return this._update();
    };

    boolean.prototype._set_active = function() {
      if (this.value === true) {
        this.el_yes.addClass('active');
        return this.el_no.removeClass('active');
      } else if (this.value === false) {
        this.el_yes.removeClass('active');
        return this.el_no.addClass('active');
      } else {
        this.el_yes.removeClass('active');
        return this.el_no.removeClass('active');
      }
    };

    boolean.prototype._key_pressed = function(e) {
      var target;
      if (!jwerty.is('space', e)) {
        return;
      }
      target = $(e.target);
      if (target.is('[data-value=yes]')) {
        this._click_yes();
      } else {
        this._click_no();
      }
      return false;
    };

    return boolean;

  })(Filter.Base);

}).call(this);
}, "fe/controllers/filter/date": function(exports, require, module) {(function() {
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Filter.date = (function(_super) {

    __extends(date, _super);

    date.prototype.template = 'filter/range';

    date.prototype.elements = {
      '[data-field=min]': 'el_min',
      '[data-field=max]': 'el_max',
      '.min-value': 'el_min_val',
      '.max-value': 'el_max_val'
    };

    function date() {
      this._show_dates = __bind(this._show_dates, this);

      this._rendered = __bind(this._rendered, this);
      date.__super__.constructor.apply(this, arguments);
      this.one('rendered', this._rendered);
      this.bind('clear', this._show_dates);
      this.bind('set', this._show_dates);
    }

    date.prototype.events = function() {
      return date.__super__.events.call(this, {
        'keydown [data-field=min]': _.debounce(this._update_field('min'), 250),
        'keydown [data-field=max]': _.debounce(this._update_field('max'), 250)
      });
    };

    date.prototype.get = function(name) {
      var v;
      if (name === 'min' || name === 'max' || name === 'value') {
        v = Date.parse(date.__super__.get.apply(this, arguments));
        if (v) {
          return v.toJSON();
        } else {
          return void 0;
        }
      } else {
        return date.__super__.get.apply(this, arguments);
      }
    };

    date.prototype.format = function(name) {
      var v;
      if (name === 'min' || name === 'max' || name === 'value') {
        v = Date.parse(date.__super__.format.apply(this, arguments));
        if (v) {
          window.d = v;
          return dust.filters.short(v);
        } else {
          return '';
        }
      } else {
        return date.__super__.format.apply(this, arguments);
      }
    };

    date.prototype._rendered = function() {};

    date.prototype._show_dates = function() {
      this.el_min_val.text(this.format('min'));
      return this.el_max_val.text(this.format('max'));
    };

    return date;

  })(Filter.Base);

}).call(this);
}, "fe/controllers/filter/range": function(exports, require, module) {(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Filter.range = (function(_super) {

    __extends(range, _super);

    range.prototype.template = 'filter/range';

    range.prototype.elements = {
      '[data-field=min]': 'el_min',
      '[data-field=max]': 'el_max'
    };

    range.prototype.events = function() {
      return range.__super__.events.call(this, {
        'keydown [data-field=min]': _.debounce(this._update_field('min'), 250),
        'keydown [data-field=max]': _.debounce(this._update_field('max'), 250)
      });
    };

    function range() {
      range.__super__.constructor.apply(this, arguments);
      this.range = true;
    }

    return range;

  })(Filter.Base);

  Filter.numeric = Filter.range;

  Filter.count = Filter.range;

}).call(this);
}, "fe/controllers/filter/related": function(exports, require, module) {(function() {
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Filter.related = (function(_super) {

    __extends(related, _super);

    related.prototype.template = 'filter/related';

    related.prototype.elements = {
      '.filter-search': 'el_items',
      'button': 'el_button'
    };

    related.prototype.events = function() {
      return related.__super__.events.call(this, {
        'click': this.toggle_search,
        'keypress': this._key_pressed
      });
    };

    function related() {
      this._key_pressed = __bind(this._key_pressed, this);

      this._on_selection = __bind(this._on_selection, this);

      this.toggle_search = __bind(this.toggle_search, this);

      this._on_deselect = __bind(this._on_deselect, this);

      this._rendered = __bind(this._rendered, this);
      related.__super__.constructor.apply(this, arguments);
      this.one('rendered', this._rendered);
    }

    related.prototype._rendered = function() {
      this.results = new SearchResults({
        el: this.el_items,
        size: 'inline',
        show_details: false,
        show_model: false,
        show_id: false,
        select_all: true
      });
      return this.results.bind('deselect', this._on_deselect);
    };

    related.prototype._on_deselect = function(instance) {
      if (this.panel) {
        return this.panel.deselect(instance);
      }
    };

    related.prototype.toggle_search = function(e) {
      var text_filter,
        _this = this;
      if (this.popover) {
        return this.popover.toggle();
      } else {
        this.search = new Search({
          action_bar: false,
          name: this.label(),
          based_on: this.resource().rel(this.metadata.relation),
          sidebar: false,
          className: 'popover-search box-layout',
          panel: {
            template: null,
            active_size: 'compact',
            className: 'search-results',
            show_model: false,
            include_invisible: true
          }
        });
        this.panel = this.search.panels[0];
        this.panel.bind('selection', this._on_selection);
        text_filter = new Filter.text({
          name: 'name',
          className: 'popover-name-filter'
        });
        text_filter.render().bind_to_panel(this.panel);
        text_filter.el_value.attr('placeholder', 'Name');
        this.popover = new Popover({
          title: "Filter by " + (this.label()),
          anchor: this.el_button,
          content: this.search,
          in_title: text_filter,
          layout_class: 'popover-layout-filter',
          should_click_dismiss: function(e) {
            return !_this.is_descendant($(e.target));
          }
        });
        this.popover.bind('show', function() {
          return _this.el_items.addClass('active');
        });
        this.popover.bind('hide', function() {
          return _this.el_items.removeClass('active');
        });
        return this.popover.show();
      }
    };

    related.prototype._on_selection = function(panel, ids) {
      var opts;
      this.results.render_instances(panel.selected());
      this.ids = ids;
      if (ids && ids.length > 0) {
        opts = {};
        opts.value = this.ids.join(',');
        if (this.negate) {
          opts.negate = true;
        }
        this.filter = opts;
        this.trigger('set', this, this.name, opts);
      } else {
        this.filter = void 0;
        this.trigger('clear', this, this.name);
      }
      return this._update();
    };

    related.prototype._key_pressed = function(e) {
      if (!jwerty.is('space', e)) {
        return;
      }
      e.preventDefault();
      return this.toggle_search();
    };

    return related;

  })(Filter.Base);

}).call(this);
}, "fe/controllers/filter/select": function(exports, require, module) {(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Filter.select = (function(_super) {

    __extends(select, _super);

    function select() {
      return select.__super__.constructor.apply(this, arguments);
    }

    select.prototype.template = 'filter/select';

    select.prototype.elements = {
      'select': 'el_value'
    };

    select.prototype.events = function() {
      return select.__super__.events.call(this, {
        'change select': this._update_field('value')
      });
    };

    select.prototype.context = function() {
      var options,
        _this = this;
      options = this.metadata.options.map(function(option) {
        return {
          name: option,
          selected: _this.value === option
        };
      });
      return select.__super__.context.apply(this, arguments).push({
        allow_blank: this.metadata["arguments"].value.validations.allow_blank,
        options: options
      });
    };

    return select;

  })(Filter.Base);

}).call(this);
}, "fe/controllers/filter/text": function(exports, require, module) {(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Filter.text = (function(_super) {

    __extends(text, _super);

    text.prototype.template = 'filter/text';

    text.prototype.elements = {
      'input': 'el_value'
    };

    text.prototype.events = function() {
      return text.__super__.events.call(this, {
        'keydown input': _.debounce(this._update_field('value'), 250)
      });
    };

    function text() {
      text.__super__.constructor.apply(this, arguments);
      this.regex = true;
    }

    return text;

  })(Filter.Base);

  Filter.ipv4 = (function(_super) {

    __extends(ipv4, _super);

    function ipv4() {
      return ipv4.__super__.constructor.apply(this, arguments);
    }

    return ipv4;

  })(Filter.text);

}).call(this);
}, "fe/controllers/filter_bar": function(exports, require, module) {(function() {
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  window.FilterBar = (function(_super) {

    __extends(FilterBar, _super);

    FilterBar.prototype.skip_parts = ['m', 'client_record', 'notes', 'record'];

    FilterBar.prototype.className = 'sidebar scrollable';

    FilterBar.prototype.elements = {
      '.create-record': 'el_create_record'
    };

    FilterBar.prototype.events = {
      'click .create-record': '_set_create_list_direction'
    };

    function FilterBar() {
      this._on_parts_change = __bind(this._on_parts_change, this);

      this._on_update = __bind(this._on_update, this);

      this._set_create_list_direction = __bind(this._set_create_list_direction, this);

      this.remove_filter = __bind(this.remove_filter, this);

      this.set_filter = __bind(this.set_filter, this);

      this.add_filter_part = __bind(this.add_filter_part, this);

      this.hide_part = __bind(this.hide_part, this);

      this.show_part = __bind(this.show_part, this);
      FilterBar.__super__.constructor.apply(this, arguments);
      this.parts = [];
      this.filter_parts = [];
      this.nd_parts = [];
      this.el_part_container = $('<div></div>');
      this.release(function() {
        var fp, _i, _len, _ref, _results;
        _ref = this.filter_parts;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          fp = _ref[_i];
          _results.push(fp.release());
        }
        return _results;
      });
    }

    FilterBar.prototype.set_active_panel = function(panel) {
      var _this = this;
      this.panel = panel;
      this.clear();
      return this.metadata(function(md_err, md) {
        var part, _i, _len, _ref;
        if (md_err) {
          return _this.trigger('error', md_err);
        }
        _this.add_filter_types();
        _this.filter_types.set_metadata(md_err, md);
        _this.show_part('record');
        _ref = _this.locked_parts;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          part = _ref[_i];
          _this.show_part(part);
        }
        return _this.add_create_button(md.models);
      });
    };

    FilterBar.prototype.add_filter_types = function() {
      var _this = this;
      this.filter_types = new FilterTypes({
        container: this
      });
      this.append(this.filter_types);
      this.filter_types.bind('select', this.show_part);
      this.filter_types.bind('deselect', this.hide_part);
      this.filter_types.bind('update', this._on_update);
      this.filter_types.bind('parts_changed', this._on_parts_change);
      this.append(this.el_part_container);
      return this.release(function() {
        return _this.filter_types.release();
      });
    };

    FilterBar.prototype.append_to = function(parent) {
      return parent.prepend(this);
    };

    FilterBar.prototype.add_create_button = function(models) {
      var _ref,
        _this = this;
      if (models && !this.options.hide_creation_options) {
        return dust.render('search/create', dust.makeBase({
          models: models.sort()
        }), function(err, html) {
          var _ref;
          if ((_ref = _this.el_create) != null) {
            _ref.remove();
          }
          _this.el_create = $(html);
          return _this.append(_this.el_create);
        });
      } else {
        return (_ref = this.el_create) != null ? _ref.remove() : void 0;
      }
    };

    FilterBar.prototype.show_parts = function(md, parts) {
      var _this = this;
      return parts.filter(function(part) {
        return _this.is_filter_part(part);
      });
    };

    FilterBar.prototype.is_filter_part = function(part) {
      return (this.skip_parts.indexOf(part) < 0) && (this.locked_parts.indexOf(part) < 0) && (this.nd_parts.indexOf(part) < 0);
    };

    FilterBar.prototype.show_part = function(part) {
      var fp,
        _this = this;
      this.parts.push(part);
      if (this.is_filter_part(part)) {
        this.panel.add_part(part);
      }
      fp = new FilterPart({
        resource: _.bind(this.panel.resource, this.panel)
      });
      return this.metadata(function(md_err, md) {
        return fp.render(_this, part, md);
      });
    };

    FilterBar.prototype.hide_part = function(part) {
      var fp, idx, _i, _len, _ref,
        _this = this;
      _ref = this.filter_parts;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        fp = _ref[_i];
        if (fp.part === part) {
          fp.release();
        }
      }
      this.panel.remove_part(part);
      idx = this.parts.indexOf(part);
      if (idx >= 0) {
        this.parts.splice(idx, 1);
      }
      this.filter_parts = this.filter_parts.filter(function(fp) {
        return fp.part !== part;
      });
      return this.metadata(function(err, md) {
        if (md) {
          return _this.add_create_button(md.models);
        }
      });
    };

    FilterBar.prototype.add_filter_part = function(fp) {
      this.filter_parts.push(fp);
      fp.bind('set_filter', this.set_filter);
      fp.bind('remove_filter', this.remove_filter);
      fp.bind('update', this._on_update);
      return this.el_part_container.append(fp.el);
    };

    FilterBar.prototype.set_filter = function(name, args) {
      this.trigger('set_filter', name, args);
      return this.panel.set_filter(name, args);
    };

    FilterBar.prototype.remove_filter = function(name) {
      this.trigger('remove_filter', name);
      return this.panel.remove_filter(name);
    };

    FilterBar.prototype.clear = function() {
      var fp, _i, _len, _ref, _ref1, _results;
      this.locked_parts = [];
      if ((_ref = this.filter_types) != null) {
        _ref.clear();
      }
      _ref1 = this.filter_parts;
      _results = [];
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        fp = _ref1[_i];
        _results.push(fp.release());
      }
      return _results;
    };

    FilterBar.prototype.metadata = function(callback) {
      var _this = this;
      if (this.panel) {
        this.locked_parts = this.panel.parts;
        return this.panel.metadata(function(md_err, md) {
          _this.nd_parts = md.non_descriptive_parts;
          _this.add_create_button(md.models);
          return callback(md_err, md);
        });
      }
    };

    FilterBar.prototype._set_create_list_direction = function() {
      var button_top, drop_up, dropdown, list_height;
      if (!this.el_create_record.hasClass('open')) {
        dropdown = this.el_create_record.find('ul');
        button_top = this.el_create_record.position().top;
        list_height = dropdown.height();
        drop_up = button_top - list_height >= 0;
        return dropdown.toggleClass('dropup-menu', drop_up);
      }
    };

    FilterBar.prototype._on_update = function() {
      return this.panel.update();
    };

    FilterBar.prototype._on_parts_change = function() {
      return this.metadata(this.filter_types.set_metadata);
    };

    return FilterBar;

  })(Spine.Controller);

}).call(this);
}, "fe/controllers/filter_part": function(exports, require, module) {(function() {
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  window.FilterPart = (function(_super) {

    __extends(FilterPart, _super);

    function FilterPart() {
      this._on_update = __bind(this._on_update, this);

      this._on_clear_filter = __bind(this._on_clear_filter, this);

      this._on_remove_filter = __bind(this._on_remove_filter, this);

      this._on_set_filter = __bind(this._on_set_filter, this);
      FilterPart.__super__.constructor.apply(this, arguments);
      this.filters = [];
      this.resource = this.options.resource;
      this.release(function() {
        var filter, _i, _len, _ref, _results;
        if (this.filters) {
          _ref = this.filters;
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            filter = _ref[_i];
            _results.push(filter.release());
          }
          return _results;
        }
      });
    }

    FilterPart.prototype.className = "filter-group";

    FilterPart.prototype.render = function(container, part, metadata) {
      var context, template,
        _this = this;
      this.part = part;
      this.metadata = metadata;
      template = "filter/is/" + part;
      if (dust.cache[template]) {
        this.visible = true;
        context = TemplateHelpers.make();
        return dust.render(template, context, function(err, html) {
          if (err) {
            _this.trigger('error', err);
            _this.html(err.message);
            return container.add_filter_part(_this);
          } else {
            _this.html(html);
            _this._insert_filters();
            return container.add_filter_part(_this);
          }
        });
      }
    };

    FilterPart.prototype._insert_filters = function() {
      var context, el, element, fc, filter, md, name, _i, _len, _ref, _results;
      context = TemplateHelpers.make();
      _ref = this.$('.filter');
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        element = _ref[_i];
        el = $(element);
        name = el.data('for');
        md = this.metadata.filters[name];
        if (md) {
          fc = Filter[md.filter_type];
        }
        if (md && fc) {
          filter = new fc({
            el: el,
            name: name,
            metadata: md,
            resource: this.resource
          });
          this.filters.push(filter);
          this._bind_filter(filter);
          _results.push(filter.render(context));
        } else {
          _results.push(el.remove());
        }
      }
      return _results;
    };

    FilterPart.prototype._bind_filter = function(filter) {
      filter.bind('remove', this._on_remove_filter);
      filter.bind('set', this._on_set_filter);
      filter.bind('clear', this._on_clear_filter);
      return filter.bind('update', this._on_update);
    };

    FilterPart.prototype._on_set_filter = function(filter, name, args) {
      return this.trigger('set_filter', name, args);
    };

    FilterPart.prototype._on_remove_filter = function(filter, name) {
      var idx;
      idx = this.filters.indexOf(filter);
      if (idx >= 0) {
        this.trigger('remove_filter', name);
        return this.filters.splice(idx, 1);
      }
    };

    FilterPart.prototype._on_clear_filter = function(filter, name) {
      return this.trigger('remove_filter', name);
    };

    FilterPart.prototype._on_update = function() {
      return this.trigger('update');
    };

    return FilterPart;

  })(Spine.Controller);

}).call(this);
}, "fe/controllers/filter_types": function(exports, require, module) {(function() {
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  window.FilterTypes = (function(_super) {

    __extends(FilterTypes, _super);

    FilterTypes.include(BasicWorkflow);

    FilterTypes.prototype.className = "filter-group";

    FilterTypes.prototype.events = {
      'click [data-category]': '_on_toggle_category',
      'change .filter-select-parts': '_on_part_selection'
    };

    FilterTypes.prototype.elements = {
      '.filter-category-list': 'el_categories',
      '.filter-select-parts': 'el_parts'
    };

    function FilterTypes() {
      this._on_part_selection = __bind(this._on_part_selection, this);

      this._on_toggle_category = __bind(this._on_toggle_category, this);

      this.deselect_part = __bind(this.deselect_part, this);

      this.select_part = __bind(this.select_part, this);

      this.set_metadata = __bind(this.set_metadata, this);

      var _this = this;
      FilterTypes.__super__.constructor.apply(this, arguments);
      this._init_workflow();
      this.parts = [];
      this.dust_template('filter/types', true);
      this.on_render(function() {
        _this.has_rendered = true;
        try {
          return _this.el_parts.select2();
        } catch (e) {
          return console.error('Select2 sucks', e.message, e.stack);
        }
      });
    }

    FilterTypes.prototype.show_parts = function(md, parts) {
      var _ref;
      if ((_ref = this.container) != null ? _ref.show_parts : void 0) {
        return this.container.show_parts(md, parts).sort();
      } else {
        return parts.sort();
      }
    };

    FilterTypes.prototype.set_metadata = function(err, md) {
      if (!this.has_rendered) {
        this.render();
      }
      this.metadata = md;
      this._update_categories(md);
      return this._update_parts(md);
    };

    FilterTypes.prototype._update_categories = function(md) {
      var cat_parts, name, _i, _len,
        _this = this;
      cat_parts = this.show_parts(md, md.categorical_parts);
      if (cat_parts.length > 1) {
        this.el_categories.html('');
        for (_i = 0, _len = cat_parts.length; _i < _len; _i++) {
          name = cat_parts[_i];
          dust.render('filter/category', dust.makeBase({
            name: name
          }), function(err, html) {
            return _this.el_categories.append(html);
          });
        }
        return this.el_categories.parent().show();
      } else {
        return this.el_categories.parent().hide();
      }
    };

    FilterTypes.prototype._update_parts = function(md) {
      var name, parts, _i, _len,
        _this = this;
      parts = this.show_parts(md, md.sibling_parts);
      if (parts.length) {
        this.el_parts.html('');
        for (_i = 0, _len = parts.length; _i < _len; _i++) {
          name = parts[_i];
          dust.render('filter/part', dust.makeBase({
            name: name,
            selected: _.include(this.parts, name)
          }), function(err, html) {
            return _this.el_parts.append(html);
          });
        }
        return this.el_parts.parent().show();
      } else {
        return this.el_parts.parent().hide();
      }
    };

    FilterTypes.prototype.select_part = function(part) {
      this.parts.push(part);
      this.$("[data-part=" + part + "]").addClass('active');
      return this.trigger('select', part);
    };

    FilterTypes.prototype.deselect_part = function(part) {
      this.parts.splice(this.parts.indexOf(part), 1);
      this.$("[data-part=" + part + "]").removeClass('active');
      return this.trigger('deselect', part);
    };

    FilterTypes.prototype.clear = function() {
      return this.html('');
    };

    FilterTypes.prototype._on_toggle_category = function(e) {
      var part, parts;
      e.preventDefault();
      e.stopPropagation();
      part = e.target.dataset.category;
      parts = this.el_parts.val() || [];
      if (parts.indexOf(part) >= 0) {
        this.el_parts.val(_.difference(parts, [part]));
      } else {
        parts.push(part);
        this.el_parts.val(parts);
      }
      return this.el_parts.trigger('change');
    };

    FilterTypes.prototype._on_part_selection = function() {
      var added, parts, removed;
      parts = this.el_parts.val() || [];
      removed = _.difference(this.parts, parts);
      removed.forEach(this.deselect_part);
      added = _.difference(parts, this.parts);
      added.forEach(this.select_part);
      this.trigger('parts_changed');
      return this.trigger('update');
    };

    return FilterTypes;

  })(Spine.Controller);

}).call(this);
}, "fe/controllers/login": function(exports, require, module) {(function() {
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  window.Login = (function(_super) {

    __extends(Login, _super);

    Login.states = [
      {
        name: 'initialize',
        from: 'Initial',
        to: 'Login'
      }, {
        name: 'forgot',
        from: '*',
        to: 'Forgot'
      }, {
        name: 'login',
        from: '*',
        to: 'Login'
      }, {
        name: 'click_login',
        from: 'Login',
        to: 'LoggingIn'
      }, {
        name: 'click_reset',
        from: 'Forgot',
        to: 'Login'
      }, {
        name: 'submit',
        from: 'Login',
        to: 'LoggingIn'
      }, {
        name: 'failure',
        from: 'LoggingIn',
        to: 'Login'
      }
    ];

    Login.menu = [
      {
        state: 'Login',
        primary: {
          options: [
            {
              event: 'login',
              label: 'Login',
              "class": 'active'
            }, {
              event: 'forgot',
              label: 'Forgot Password'
            }
          ]
        }
      }, {
        state: 'LoggingIn',
        primary: {
          options: [
            {
              event: 'login',
              label: 'Login',
              "class": 'active'
            }, {
              event: 'forgot',
              label: 'Forgot Password'
            }
          ]
        }
      }, {
        state: 'Forgot',
        primary: {
          options: [
            {
              event: 'login',
              label: 'Login'
            }, {
              event: 'forgot',
              label: 'Forgot Password',
              "class": 'active'
            }
          ]
        }
      }
    ];

    Login.metadata = {
      properties: {
        name: {
          type: 'text',
          validations: {}
        },
        email: {
          type: 'text',
          validations: {}
        },
        password: {
          type: 'password',
          validations: {}
        },
        phone: {
          type: 'text',
          validations: {}
        },
        details: {
          type: 'text',
          validations: {}
        }
      }
    };

    Login.templates = {
      'Login': 'login',
      'Forgot': 'forgot_password'
    };

    Login.prototype.events = {
      'keypress form': '_handle_enter_key',
      'click button': 'prevent_default'
    };

    function Login(_arg) {
      var _this = this;
      this.post_login_path = _arg.post_login_path;
      this._handle_enter_key = __bind(this._handle_enter_key, this);

      this.logged_in = __bind(this.logged_in, this);

      this.reset = __bind(this.reset, this);

      this.login = __bind(this.login, this);

      Login.__super__.constructor.apply(this, arguments);
      this.states(Login.states);
      this.title('Login - LightMesh CMDB');
      this.attr('menu', Login.menu);
      this.attr('page_type', 'Account');
      this.topbar(new WfTopbar());
      this.attr('display_name', function(wf) {
        switch (_this.state()) {
          case 'Forgot':
            return 'Forgot Password';
          case 'Request':
            return 'Request Account';
          default:
            return 'Login';
        }
      });
      this.attr('metadata', Login.metadata);
      this.attr('dust_context', function() {
        return TemplateHelpers.make().push(Login.metadata);
      });
      this.instance(new xn.instance.Record(Xn));
      this.on_render(this.render_controllers);
      this.on_state_change(this.topbar().may_render);
      this.dust_template('model');
      ['Login', 'Forgot', 'Request'].forEach(function(name) {
        _this.on_enter(name, _this.appends(name, function() {
          var mp;
          mp = new ModelPart().attr('part', function() {
            return Login.templates[name];
          }).state('Edit').on_before('*', function(wf, e) {
            return _this.event(e);
          });
          mp.non_explicit_elements();
          return mp;
        }));
        _this.on_enter(name, _this.renders(name, function() {
          return _this.attr('dust_context');
        }));
        return _this.on_leave(name, _this.releases(name));
      });
      this.on_enter('LoggingIn', this.login);
      this.on_before('click_reset', this.reset);
      this.on_before('failure', function() {
        return _this.instance().attr('password', '');
      });
      this.welcome_note();
    }

    Login.prototype.welcome_note = function() {
      if (navigator.userAgent.match(/Chrome/)) {
        return this.good_news('Welcome to LightMesh', 'Please log in to begin').render().remove_button('close');
      } else {
        return this.bad_news('LightMesh works best with Google Chrome', 'Please take a moment to switch to that browser or install it\
                 now. Installation is easy and requires no special access or\
                 administrator privileges').add_button('install_chrome', 'Get Chrome', {
          "class": 'btn-success'
        }).attr('sticky', true).on_after('install_chrome', function(n) {
          return window.location = 'http://www.google.com/chrome';
        }).render();
      }
    };

    Login.prototype.login = function() {
      return $.ajax({
        url: '/sessions.json',
        type: 'POST',
        data: {
          user: this.instance().modifications()
        }
      }).done(this.logged_in).fail(this.fail_with('Login failed', {
        event: 'failure',
        clear: true
      }));
    };

    Login.prototype.reset = function() {
      return $.ajax({
        url: '/users/password.json',
        type: 'POST',
        data: {
          user: this.instance().data
        }
      }).done(this.succeed_with('Password reset initiated', {
        clear: true
      })).fail(this.fail_with('Failed to reset password', {
        clear: true
      }));
    };

    Login.prototype.logged_in = function(response) {
      var client, token, _ref;
      _ref = response.token.split(' '), client = _ref[0], token = _ref[1];
      document.cookie = "XNClient=" + client + "; path=/";
      document.cookie = "XNToken=" + token + "; path=/";
      Xn.set_token(response.token);
      if (this.post_login_path) {
        return Spine.Route.navigate(this.post_login_path);
      } else {
        return Spine.Route.navigate('/');
      }
    };

    Login.prototype._handle_enter_key = function(e) {
      if (e.which === 13) {
        e.preventDefault();
        $(e.currentTarget).find('button').focus();
        return this.event('submit');
      }
    };

    return Login;

  })(Workflow);

}).call(this);
}, "fe/controllers/menu": function(exports, require, module) {(function() {
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  window.Menu = (function(_super) {

    __extends(Menu, _super);

    Menu.prototype.elements = {
      '.menu-pane': 'el_pane',
      '[data-bind=username]': 'el_username',
      '[data-bind=group]': 'el_group',
      '#menu': 'el_menu',
      '#logo-bar': 'el_logo_bar'
    };

    Menu.prototype.events = {
      'click .menu-tab': 'click_menu_tab',
      'click a.menu-item': 'click_item',
      'click [data-event=logout]': 'logout',
      'click .menu-toggle-target': 'toggle'
    };

    function Menu() {
      this.on_change_user = __bind(this.on_change_user, this);

      this.on_invalid_token = __bind(this.on_invalid_token, this);

      this.toggle = __bind(this.toggle, this);

      this.logout = __bind(this.logout, this);
      Menu.__super__.constructor.apply(this, arguments);
      this.body = $('body');
      this.show_menu_tab(this.$('.menu-tab')[0]);
      this.menu = true;
      this.bars = [];
      this.on_change_user(Xn.user);
      Spine.bind('token:invalid', this.on_invalid_token);
      Spine.bind('user:changed', this.on_change_user);
    }

    Menu.prototype.logout = function(e) {
      if (e != null) {
        e.preventDefault();
      }
      Xn.logout();
      return Spine.Route.navigate('/login');
    };

    Menu.prototype.click_menu_tab = function(e) {
      return this.show_menu_tab(e.target);
    };

    Menu.prototype.show_menu_tab = function(target) {
      if (this.selected !== target) {
        $(this.selected).removeClass('active');
        this.selected = target;
        $(target).addClass('active');
        if (this.el_selected_pane) {
          this.el_selected_pane.removeClass('active').addClass('hide');
        }
        this.el_selected_pane = $('#' + target.id.replace(/tab/, 'pane'));
        return this.el_selected_pane.addClass('active').removeClass('hide');
      }
    };

    Menu.prototype.toggle = function() {
      return this.menu && (this.show() || this.hide());
    };

    Menu.prototype.hide = function(full) {
      if (full) {
        this.menu = false;
      }
      if (this.visible) {
        this.visible = false;
        this.trigger('hide');
        this.body.removeClass('menu-open');
        return this.el_menu.slideUp(500);
      }
    };

    Menu.prototype.show = function(full) {
      if (full) {
        this.menu = true;
      }
      if (!this.visible) {
        this.trigger('show');
        this.body.addClass('menu-open');
        this.el_menu.slideDown(500);
        if (this.$('.menu-tab.active:visible').length === 0) {
          this.show_menu_tab(this.$('.menu-tab:visible')[0]);
        }
        return this.visible = true;
      }
    };

    Menu.prototype.add_bar = function(bar) {
      this.append(bar);
      return this.bars.push(bar);
    };

    Menu.prototype.closed_height = function() {
      return this.el_logo_bar.outerHeight(true) + _.reduce(this.bars, (function(n, b) {
        return n + b.el.height();
      }), 0);
    };

    Menu.prototype.remove_bar = function(bar) {
      var i;
      i = this.bars.indexOf(bar);
      if (i >= 0) {
        this.bars.splice(i, 1);
        return bar.release();
      }
    };

    Menu.prototype.click_item = function(e) {
      var el;
      if (!($(e.target).data('external-url') != null)) {
        e.preventDefault();
        e.stopPropagation();
        this.$('.menu-item-selected').removeClass('menu-item-selected');
        el = $(e.target);
        el.addClass('menu-item-selected');
        return Spine.Route.navigate(el.attr('href'));
      }
    };

    Menu.prototype.on_invalid_token = function() {
      return this.hide(true);
    };

    Menu.prototype.on_change_user = function(user) {
      var group, selectors, _i, _len, _ref;
      if (user) {
        this.menu = true;
        user = user.toJSON();
        this.el_group.html(this.menu_group_contents(user));
        this.el_username.text(user.name);
        selectors = [];
        _ref = user.groups;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          group = _ref[_i];
          selectors.push("[data-groups~=" + group.key + "]");
        }
        this.$("[data-groups]").hide();
        return this.$(selectors.join(',')).show();
      } else {
        return this.hide(true);
      }
    };

    Menu.prototype.menu_group_contents = function(user) {
      var group;
      group = user.groups[0];
      if (!(group != null)) {
        return '';
      }
      switch (group.key) {
        case 'client_admins':
          return $('<a>', {
            href: '/users',
            'data-external-url': ''
          }).text(group.name);
        default:
          return group.name;
      }
    };

    return Menu;

  })(BaseController);

}).call(this);
}, "fe/controllers/model": function(exports, require, module) {(function() {
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  window.Model = (function(_super) {

    __extends(Model, _super);

    Model.display_name = function(wf) {
      var inst, name;
      inst = wf.instance();
      if (!(inst != null)) {
        return "(no record)";
      } else if (inst.is_new()) {
        name = inst.attr('name');
        if (name) {
          return "" + name + " (new record)";
        } else {
          return "(new record)";
        }
      } else {
        return inst.attr('display_name');
      }
    };

    Model.title = function(wf) {
      return "" + (wf.attr('display_name')) + " - " + (dust.filters.capitalize(wf.attr('page_type'))) + " - LightMesh CMDB";
    };

    Model.states = [
      {
        name: 'initialize',
        from: 'Initial',
        to: 'View'
      }, {
        name: 'view',
        from: 'Initial',
        to: 'View'
      }, {
        name: 'verify',
        from: ['Initial', 'View'],
        to: 'Verify'
      }, {
        name: 'edit',
        from: ['Initial', 'View'],
        to: 'Edit'
      }, {
        name: 'history',
        from: 'View',
        to: 'View'
      }, {
        name: 'clone',
        from: 'View',
        to: 'View'
      }, {
        name: 'save',
        from: 'Edit',
        to: 'Saving'
      }, {
        name: 'delete',
        from: 'Edit',
        to: 'Deleting'
      }, {
        name: 'saved',
        from: 'Saving',
        to: 'View'
      }, {
        name: 'not_saved',
        from: 'Saving',
        to: 'Edit'
      }, {
        name: 'deleted',
        from: ['Edit', 'Deleting'],
        to: 'View'
      }, {
        name: 'not_deleted',
        from: 'Deleting',
        to: 'Edit'
      }, {
        name: 'cancel',
        from: ['History', 'Verify', 'Edit'],
        to: 'View'
      }, {
        name: 'reload',
        from: 'Edit',
        to: 'Reloading'
      }, {
        name: 'reloaded',
        from: 'Reloading',
        to: 'View'
      }, {
        name: 'new',
        from: 'View',
        to: 'New'
      }
    ];

    Model.include(BranchWorkflow);

    Model.include(WorkflowStateMachine);

    Model.prototype.className = 'wf-model';

    Model.prototype.events = {
      'reload': '_reload'
    };

    function Model() {
      this.toggle_history = __bind(this.toggle_history, this);

      this.toggle_clone = __bind(this.toggle_clone, this);

      this._validations_changed = __bind(this._validations_changed, this);

      this._update_validation_message = __bind(this._update_validation_message, this);

      this._save = __bind(this._save, this);

      this._to_new = __bind(this._to_new, this);

      this._reload = __bind(this._reload, this);

      this.cascade_state = __bind(this.cascade_state, this);

      this.dust_context = __bind(this.dust_context, this);

      this._change_state_css = __bind(this._change_state_css, this);

      this._create_controllers = __bind(this._create_controllers, this);

      this._metadata_changed = __bind(this._metadata_changed, this);

      this._instance_changed = __bind(this._instance_changed, this);

      this.render_parts = __bind(this.render_parts, this);
      Model.__super__.constructor.apply(this, arguments);
      this.states(Model.states);
      this.attr('display_name', Model.display_name);
      this.on_enter(['View', 'Edit'], this.cascade_state);
      this.on_enter(['View', 'Edit'], this.clear_notices);
      this.on_enter('Edit', this._update_validation_message);
      this.on_after('save', this._save);
      this.on_after('delete', this["delete"]);
      this.on_after('history', this.toggle_history);
      this.on_after('clone', this.toggle_clone);
      this.on_enter('Reloading', this._reload);
      this.on_change('instance', this._instance_changed);
      this.on_change('metadata', this._metadata_changed);
      this.on_change('validations', this._validations_changed);
      this.on_enter('New', this._to_new);
      this.dust_template('model');
      this.attr('dust_context', this.dust_context);
      this.on_render(this.render_parts);
      this.on_state_change(this._change_state_css);
    }

    Model.prototype.render_parts = function(wf, context) {
      var _ref,
        _this = this;
      if ((_ref = this.instance()) != null ? _ref.type() : void 0) {
        return this.instance().type().on_metadata(function(err) {
          if (err) {
            return _this.attr('error', err);
          } else {
            return _this.render_controllers(_this, context);
          }
        });
      } else {
        return this.render_controllers(this, context);
      }
    };

    Model.prototype._instance_changed = function(wf, inst) {
      var type, _ref, _ref1,
        _this = this;
      if ((_ref = this._model_history) != null) {
        _ref.instance_changed(inst);
      }
      if ((_ref1 = this._model_clone) != null) {
        _ref1.instance_changed(inst);
      }
      this.attr('validations', []);
      type = inst != null ? inst.type() : void 0;
      return type != null ? type.metadata(function(err, metadata) {
        return _this.attr('metadata', metadata);
      }) : void 0;
    };

    Model.prototype._metadata_changed = function(wf, metadata, name, old_metadata) {
      return this._create_controllers(metadata);
    };

    Model.prototype._create_controllers = function(metadata) {
      this._release_controllers();
      this._create_actions(metadata);
      this._add_model_part('record', 1);
      if (metadata.parts) {
        this._add_parts(metadata.parts, 2);
      }
      return this.render();
    };

    Model.prototype._create_actions = function(metadata) {
      this.actions = new ModelActions({
        instance: this.attr('instance'),
        metadata: metadata
      });
      return this.controller('actions', this.actions, 0);
    };

    Model.prototype._add_parts = function(parts, pos) {
      var i, part, _results;
      i = parts.length;
      _results = [];
      while (i -= 1) {
        part = parts[i];
        switch (part) {
          case 'record':
            break;
          case 'has_notes':
            _results.push(this._add_model_part(part, ++pos, Notes));
            break;
          default:
            _results.push(this._add_model_part(part, ++pos));
        }
      }
      return _results;
    };

    Model.prototype._add_model_part = function(part, pos, controller_cls) {
      var _ref;
      if (controller_cls == null) {
        controller_cls = ModelPart;
      }
      if ((_ref = this.actions) != null) {
        _ref.add_part(part);
      }
      return this.controller(part, (function(wf) {
        var mp;
        mp = new controller_cls().attr('part', part).state(wf.state());
        if (mp.has_template()) {
          return mp;
        }
      }), pos);
    };

    Model.prototype._change_state_css = function(sender, details) {
      var _ref, _ref1;
      if (this.el) {
        return this.el.removeClass("wf-state-" + ((_ref1 = details.from) != null ? _ref1.toLowerCase() : void 0)).addClass("wf-state-" + ((_ref = details.to) != null ? _ref.toLowerCase() : void 0));
      }
    };

    Model.prototype.dust_context = function() {
      return this.attr('dust_base').push({
        id: this.attr('instance').id(),
        instance: this.attr('instance').toJSON(2),
        current_user: Xn.user.toJSON(1)
      });
    };

    Model.prototype.cascade_state = function() {
      return this._each_controller('state', this.state());
    };

    Model.prototype._reload = function() {
      var _this = this;
      this.instance().reload(function(err) {
        if (err) {
          _this.event('reloaded');
          return _this.bad_news("Unable to reload record").last_for(5).render();
        } else {
          _this.event('reloaded');
          return _this.notice("Reloaded record").last_for(5).render();
        }
      });
      return false;
    };

    Model.prototype._to_new = function() {
      var url;
      url = this.instance().xnid().split('/');
      url.pop();
      url.pop();
      url.push('new');
      return Spine.Route.navigate(url.join('/'));
    };

    Model.prototype._save = function() {
      var _this = this;
      return this.instance().save(function(err, changed, record, validations) {
        var _ref;
        if (err) {
          _this.event('not_saved');
          return _this.bad_news('Could Not Save', err).render();
        } else {
          _this.event('saved');
          if (changed) {
            _this.apply_validations(validations);
            return (_ref = _this._model_history) != null ? _ref.instance_changed(_this.instance()) : void 0;
          } else {
            return main.good_news('Nothing Changed').last_for(5).render();
          }
        }
      });
    };

    Model.prototype["delete"] = function(wf) {
      var _this = this;
      if (confirm("Delete this record?")) {
        return wf.instance().destroy(function(err) {
          if (err) {
            wf.event('not_deleted');
            return wf.bad_news('Could Not Delete', err).last_for(5).render();
          } else {
            wf.event('deleted');
            return main.good_news('That record is GONE', 'Take one last look at it').last_for(5).render();
          }
        });
      } else {
        wf.event('not_deleted');
        return main.good_news('Delete Cancelled.').render();
      }
    };

    Model.prototype._update_validation_message = function() {
      var notice, _i, _len, _ref, _ref1;
      _ref1 = (_ref = this.notices) != null ? _ref : [];
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        notice = _ref1[_i];
        if (notice.attr('validations')) {
          notice.attr('sticky', false).remove_button('edit');
        }
      }
      return null;
    };

    Model.prototype._validations_changed = function(wf, vals) {
      var error, name, type, _i, _len, _ref;
      this._validations = vals;
      this.$('.dv-property.error').removeClass('error');
      for (_i = 0, _len = vals.length; _i < _len; _i++) {
        _ref = vals[_i], type = _ref[0], name = _ref[1], error = _ref[2];
        this.$("[data-" + type + "=" + name + "]").addClass('error');
      }
      return null;
    };

    Model.prototype.toggle_clone = function() {
      var clone_btn,
        _this = this;
      clone_btn = typeof this.topbar === "function" ? this.topbar().button_for_event('clone') : void 0;
      if (!this._model_clone) {
        this._model_clone = new ModelClone({
          instance: this.attr('instance'),
          metadata: this.attr('metadata')
        });
        this._clone_popover = new Popover({
          title: 'Duplicate Record',
          anchor: clone_btn,
          controller: this._model_clone,
          layout_class: 'popover-history',
          side: 'bottom'
        });
        this.release(function() {
          _this._clone_popover.release();
          return _this._model_clone.release();
        });
      }
      this._model_clone.workflow(this);
      this._model_clone.render();
      this._clone_popover.set_anchor(clone_btn);
      this._clone_popover.should_click_dismiss = function(e) {
        return !clone_btn.is($(e.target));
      };
      return this._clone_popover.toggle();
    };

    Model.prototype.toggle_history = function() {
      var history_btn,
        _this = this;
      history_btn = typeof this.topbar === "function" ? this.topbar().button_for_event('history') : void 0;
      if (!this._model_history) {
        this._model_history = new ModelHistory({
          instance: this.attr('instance'),
          metadata: this.attr('metadata')
        });
        this._history_popover = new Popover({
          title: 'History',
          anchor: history_btn,
          controller: this._model_history,
          layout_class: 'popover-history',
          side: 'bottom'
        });
        this.release(function() {
          _this._history_popover.release();
          return _this._model_history.release();
        });
      }
      this._model_history.render();
      this._history_popover.set_anchor(history_btn);
      this._history_popover.should_click_dismiss = function(e) {
        return !history_btn.is($(e.target));
      };
      return this._history_popover.toggle();
    };

    Model.prototype.apply_validations = function(validations) {
      var text,
        _this = this;
      if (validations.length > 0) {
        text = this.validation_messages(validations);
        main.notice('Record Saved With Warnings', text).add_button('edit', 'Correct them', {
          "class": 'btn-success'
        }).add_button('view', 'Later', {
          close: true
        }).add_button('cancel_timeout', 'Wait', {
          "class": 'btn-notice',
          remove_button: true
        }).attr('sticky', true).attr('validations', true).last_for(10, 'view').release(function() {
          return _this.attr('validations', []);
        }).on_after('edit', function(n) {
          return n.event('cancel_timeout');
        }).render();
        return this.attr('validations', validations);
      } else {
        return main.good_news('The record saved', 'Your data is safe!').render();
      }
    };

    Model.prototype.validation_messages = function(validations) {
      var grouped, messages;
      grouped = _.groupBy(validations, function(val) {
        return "" + val[0] + "," + val[2];
      });
      return messages = _.map(grouped, function(vals) {
        var error, list, names, type;
        type = vals[0][0];
        error = vals[0][2];
        names = _.map(vals, function(v) {
          return dust.filters.capitalize(v[1]);
        });
        if (vals.length > 1) {
          type += 's';
          list = names.slice(0, names.length - 1);
          list.push("and " + names[names.length - 1]);
          names = list.join(', ');
        }
        return "The " + type + " " + names + " " + error + ".";
      });
    };

    return Model;

  })(BaseController);

  window.ModelPage = (function(_super) {

    __extends(ModelPage, _super);

    ModelPage.menu = function(wf) {
      var edit, md, menu, view, _ref;
      md = (_ref = wf.attr('metadata')) != null ? _ref : {};
      menu = [
        {
          state: 'Verify',
          primary: {
            options: [
              {
                event: 'cancel',
                label: 'Cancel'
              }
            ]
          }
        }, {
          state: 'History',
          primary: {
            options: [
              {
                event: 'cancel',
                label: 'Cancel'
              }
            ]
          }
        }
      ];
      if (md.update_access) {
        edit = {
          state: 'Edit',
          primary: {
            options: [
              {
                event: 'save',
                label: 'Save'
              }, {
                event: 'reload',
                label: 'Cancel'
              }
            ]
          }
        };
        if (md.delete_access) {
          edit.secondary = {
            options: [
              {
                event: 'delete',
                label: 'Delete'
              }
            ]
          };
        }
        menu.push(edit);
      }
      view = {
        state: 'View',
        primary: {
          options: [
            {
              event: 'history',
              label: 'History'
            }, {
              event: 'verify',
              label: 'Verify Data'
            }
          ]
        }
      };
      if (md.create_access) {
        view.secondary = {
          options: [
            {
              event: 'new',
              label: 'New'
            }, {
              event: 'clone',
              label: 'Duplicate'
            }
          ]
        };
      }
      if (md.update_access) {
        view.primary.options.push({
          event: 'edit',
          label: 'Edit'
        });
      }
      menu.push(view);
      return menu;
    };

    ModelPage.include(RootWorkflow);

    function ModelPage(model_name) {
      ModelPage.__super__.constructor.call(this);
      this.attr('model_name', model_name);
      this.attr('page_type', dust.filters.capitalize(model_name));
      this.attr('menu', ModelPage.menu);
      this.topbar(new WfTopbar());
      this.title(Model.title);
      this.on_change('instance', this.update_title);
      this.on_change('metadata', this.topbar().may_render);
      this.on_enter('View', this.topbar().may_render);
      this.on_enter('View', this.update_title);
    }

    return ModelPage;

  })(Model);

}).call(this);
}, "fe/controllers/model_actions": function(exports, require, module) {(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  window.ModelActions = (function(_super) {

    __extends(ModelActions, _super);

    ModelActions.include(BranchWorkflow);

    ModelActions.template = function(part_name) {
      return "model/action/" + part_name;
    };

    ModelActions.has_template = function(part_name) {
      return dust.cache[this.template(part_name)] != null;
    };

    ModelActions.prototype.className = 'dv-actions';

    ModelActions.prototype.elements = {
      '[data-method-name]': 'el_actions'
    };

    function ModelActions(_arg) {
      this.instance = _arg.instance, this.metadata = _arg.metadata;
      ModelActions.__super__.constructor.apply(this, arguments);
      this.part_names = [];
    }

    ModelActions.prototype.add_part = function(part_name) {
      if (ModelActions.has_template(part_name)) {
        return this.part_names.push(part_name);
      }
    };

    ModelActions.prototype.render = function(__, context) {
      var actions, section_names,
        _this = this;
      this._release_controllers();
      actions = this._render_actions(context);
      if (actions.length === 0) {
        this.hide();
        return;
      }
      section_names = this._extract_sections(actions);
      dust.render('model/action/model_actions', context.push({
        sections: section_names
      }), function(err, html) {
        if (err) {
          return _this.trigger('error', err, _this);
        }
        return _this.html(html);
      });
      this._append_and_init_actions(section_names, actions);
      return this;
    };

    ModelActions.prototype._render_actions = function(context) {
      var actions, part_name, _i, _len, _ref,
        _this = this;
      actions = $();
      _ref = this.part_names;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        part_name = _ref[_i];
        dust.render(ModelActions.template(part_name), context, function(err, html) {
          if (err) {
            return _this.trigger('error', err, _this);
          }
          return actions = actions.add($.parseHTML(html, true));
        });
      }
      return actions;
    };

    ModelActions.prototype._extract_sections = function(actions) {
      var el, sections, _i, _len, _ref;
      sections = {};
      _ref = actions.filter('[data-category]');
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        el = _ref[_i];
        sections[el.dataset.category] = true;
      }
      return _.keys(sections).sort();
    };

    ModelActions.prototype._append_and_init_actions = function(section_names, actions) {
      var category_actions, name, _i, _len,
        _this = this;
      for (_i = 0, _len = section_names.length; _i < _len; _i++) {
        name = section_names[_i];
        category_actions = _.sortBy(actions.filter("[data-category=" + name + "]"), function(el) {
          return el.dataset.methodName;
        });
        this.$("section[data-category=" + name + "]").append(category_actions);
        actions = actions.not(category_actions);
      }
      this.append(actions.filter('script'));
      return Action.create_actions(this, this.el_actions, this.metadata, this.instance, function(name, controller) {
        return _this.controller(name, controller);
      });
    };

    return ModelActions;

  })(BaseController);

}).call(this);
}, "fe/controllers/model_clone": function(exports, require, module) {(function() {
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  window.ModelClone = (function(_super) {

    __extends(ModelClone, _super);

    ModelClone.prototype.events = {
      'click .clone-execute': '_execute_clicked'
    };

    function ModelClone(_arg) {
      this.instance = _arg.instance;
      this._render = __bind(this._render, this);

      this._clone_success = __bind(this._clone_success, this);

      this._execute_clicked = __bind(this._execute_clicked, this);

      this._massage_data = __bind(this._massage_data, this);

      this.instance_changed = __bind(this.instance_changed, this);

      ModelClone.__super__.constructor.apply(this, arguments);
      this.on_render(this._render);
    }

    ModelClone.prototype.instance_changed = function(instance) {
      this.instance = instance;
      return this._plan = null;
    };

    ModelClone.prototype._request_plan = function() {
      var _this = this;
      this._plan = null;
      this._plan_rendered = false;
      return this.instance.document("clone_plan").all().then(this._massage_data).then(function() {
        return _this.render();
      });
    };

    ModelClone.prototype._massage_data = function(plan) {
      return this._plan = plan;
    };

    ModelClone.prototype._construct_final_plan = function() {
      return this._plan;
    };

    ModelClone.prototype._execute_clicked = function(e) {
      var plan,
        _this = this;
      plan = this._construct_final_plan();
      return this.instance.action('clone', plan).return_result().execute(function(err, result) {
        if (!err) {
          console.log(result[0].model());
          return result[0].refresh().then(_this._clone_success(result[0]));
        }
      });
    };

    ModelClone.prototype._clone_success = function(record) {
      var _this = this;
      return function() {
        _this.workflow().toggle_clone();
        _this.workflow().instance(record).render().event('edit');
        window.history.pushState({}, "", record.xnid());
        return main.good_news("Clone ok!").render();
      };
    };

    ModelClone.prototype._dust_context = function() {
      return this.attr('dust_base').push({
        plan: this._plan['plan'],
        clone_count: this._plan['clone'].length - 1,
        link_count: this._plan['link'].length
      });
    };

    ModelClone.prototype._render = function(wf, context) {
      if (this._plan != null) {
        if (!this._plan_rendered) {
          return this._render_plan();
        }
      } else {
        this._request_plan();
        return this._render_loading();
      }
    };

    ModelClone.prototype._render_plan = function() {
      var _this = this;
      dust.render('model/clone/plan', this._dust_context(), function(err, html) {
        if (err) {
          return _this.trigger('error', err, _this);
        }
        return _this.html(html);
      });
      return this._plan_rendered = true;
    };

    ModelClone.prototype._render_loading = function() {
      return this.html('Loading...');
    };

    return ModelClone;

  })(BaseController);

}).call(this);
}, "fe/controllers/model_history": function(exports, require, module) {(function() {
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  window.ModelHistory = (function(_super) {

    __extends(ModelHistory, _super);

    ModelHistory.prototype.ADDITION_ICON = 'icon-plus-sign';

    ModelHistory.prototype.REMOVAL_ICON = 'icon-minus-sign';

    ModelHistory.prototype.ADDITION_CLASS = 'addition';

    ModelHistory.prototype.REMOVAL_CLASS = 'removal';

    ModelHistory.prototype.events = {
      'click .attr-name': '_attr_header_clicked'
    };

    function ModelHistory(_arg) {
      this.instance = _arg.instance, this.metadata = _arg.metadata;
      this._render = __bind(this._render, this);

      this._attr_header_clicked = __bind(this._attr_header_clicked, this);

      this._massage_data = __bind(this._massage_data, this);

      this.toggle_attributes = __bind(this.toggle_attributes, this);

      this.instance_changed = __bind(this.instance_changed, this);

      ModelHistory.__super__.constructor.apply(this, arguments);
      this.on_render(this._render);
    }

    ModelHistory.prototype.instance_changed = function(instance) {
      this.instance = instance;
      return this._history = null;
    };

    ModelHistory.prototype.action_content = function() {
      var content,
        _this = this;
      content = null;
      dust.render('model/history/popover_actions', this.attr('dust_base'), function(err, html) {
        if (err) {
          return _this.trigger('error', err, _this);
        }
        return content = $(html);
      });
      content.find('.expand').click(function(e) {
        e.preventDefault();
        return _this.toggle_attributes(true);
      });
      content.find('.collapse').click(function(e) {
        e.preventDefault();
        return _this.toggle_attributes(false);
      });
      content.find('.refresh').click(function(e) {
        e.preventDefault();
        _this._render_loading();
        return _this._request_history();
      });
      return content;
    };

    ModelHistory.prototype.toggle_attributes = function(flag) {
      return this._toggle_attrs(this.$('.attr-name'), flag);
    };

    ModelHistory.prototype._request_history = function() {
      var _this = this;
      this._history = null;
      this._history_rendered = false;
      return this.instance.history().all().then(this._massage_data).then(function() {
        return _this.render();
      });
    };

    ModelHistory.prototype._massage_data = function(history) {
      var item, name, prop_info, rel_info, _i, _len, _ref, _ref1;
      this._history = history;
      for (_i = 0, _len = history.length; _i < _len; _i++) {
        item = history[_i];
        this._generate_subject_line(item);
        switch (item.action) {
          case 'create':
            item.created = true;
            break;
          case 'delete':
            item.deleted = true;
            break;
          default:
            item.changed = true;
            item.changed_attrs = [];
            _ref = item.properties;
            for (name in _ref) {
              prop_info = _ref[name];
              item.changed_attrs.push(this._massage_prop(name, prop_info));
            }
            _ref1 = item.rels;
            for (name in _ref1) {
              rel_info = _ref1[name];
              item.changed_attrs.push(this._massage_rel(name, rel_info));
            }
            item.changed_attrs = _.sortBy(item.changed_attrs, 'name');
        }
      }
    };

    ModelHistory.prototype._generate_subject_line = function(item) {
      var base_url;
      if (item.transaction.user_name) {
        base_url = this.attr('dust_base').global.base_url;
        return item.transaction.email_subject = "Regarding the change to " + (this.instance.attr('display_name')) + " (" + base_url + "/" + item.xnid + ")";
      }
    };

    ModelHistory.prototype._massage_rel = function(name, attr_info) {
      var _this = this;
      attr_info.rel = true;
      this._massage_attribute(name, attr_info, function() {
        var addition, change, removal, _i, _j, _k, _len, _len1, _len2, _ref, _ref1, _ref2, _ref3, _ref4;
        attr_info.addition_count = (_ref = attr_info.add) != null ? _ref.length : void 0;
        attr_info.removal_count = (_ref1 = attr_info.remove) != null ? _ref1.length : void 0;
        attr_info.add || (attr_info.add = []);
        attr_info.remove || (attr_info.remove = []);
        _ref2 = attr_info.add;
        for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
          addition = _ref2[_i];
          addition.css_class = _this.ADDITION_CLASS;
          addition.icon_class = _this.ADDITION_ICON;
        }
        _ref3 = attr_info.remove;
        for (_j = 0, _len1 = _ref3.length; _j < _len1; _j++) {
          removal = _ref3[_j];
          removal.css_class = _this.REMOVAL_CLASS;
          removal.icon_class = _this.REMOVAL_ICON;
        }
        _ref4 = attr_info.add.slice().concat(attr_info.remove);
        for (_k = 0, _len2 = _ref4.length; _k < _len2; _k++) {
          change = _ref4[_k];
          change.value = change.name || change.id;
        }
      });
      attr_info.changes.sort(function(a, b) {
        return a.value.localeCompare(b.value);
      });
      return attr_info;
    };

    ModelHistory.prototype._massage_prop = function(name, attr_info) {
      var _this = this;
      attr_info.prop = true;
      return this._massage_attribute(name, attr_info, function() {
        if (attr_info.add) {
          attr_info.add = [
            {
              css_class: _this.ADDITION_CLASS,
              icon_class: _this.ADDITION_ICON,
              value: attr_info.add
            }
          ];
          attr_info.addition_marker = true;
        }
        if (attr_info.remove) {
          attr_info.remove = [
            {
              css_class: _this.REMOVAL_CLASS,
              icon_class: _this.REMOVAL_ICON,
              value: attr_info.remove
            }
          ];
          attr_info.removal_marker = true;
        }
      });
    };

    ModelHistory.prototype._massage_attribute = function(name, attr_info, attr_configurator) {
      attr_info.name = name;
      attr_configurator();
      attr_info.changes = (attr_info.add || []).concat(attr_info.remove || []);
      return attr_info;
    };

    ModelHistory.prototype._attr_header_clicked = function(e) {
      return this._toggle_attrs($(e.currentTarget));
    };

    ModelHistory.prototype._toggle_attrs = function(els, flag) {
      var el, _i, _len, _results;
      _results = [];
      for (_i = 0, _len = els.length; _i < _len; _i++) {
        el = els[_i];
        el = $(el);
        if (flag !== this._is_attr_visible(el)) {
          el.find('.disclosure').toggle(0);
          _results.push(el.siblings('.diffs').slideToggle(150));
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    };

    ModelHistory.prototype._is_attr_visible = function(el) {
      return el.siblings('.diffs').is(':visible');
    };

    ModelHistory.prototype._dust_context = function() {
      return this.attr('dust_base').push({
        history_items: this._history
      });
    };

    ModelHistory.prototype._render = function(wf, context) {
      if (this._history != null) {
        if (!this._history_rendered) {
          return this._render_history();
        }
      } else {
        this._request_history();
        return this._render_loading();
      }
    };

    ModelHistory.prototype._render_history = function() {
      var _this = this;
      dust.render('model/history/list', this._dust_context(), function(err, html) {
        if (err) {
          return _this.trigger('error', err, _this);
        }
        return _this.html(html);
      });
      return this._history_rendered = true;
    };

    ModelHistory.prototype._render_loading = function() {
      return this.html('Loading...');
    };

    return ModelHistory;

  })(BaseController);

}).call(this);
}, "fe/controllers/model_part": function(exports, require, module) {(function() {
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  window.ModelPart = (function(_super) {

    __extends(ModelPart, _super);

    ModelPart.include(WorkflowSimpleStates);

    ModelPart.include(WorkflowSimpleEvents);

    function ModelPart() {
      this._release = __bind(this._release, this);

      this.apply_validations = __bind(this.apply_validations, this);

      this.clear_validations = __bind(this.clear_validations, this);

      this.edit = __bind(this.edit, this);

      this.read = __bind(this.read, this);

      var _this = this;
      ModelPart.__super__.constructor.apply(this, arguments);
      this._el_supplied = !!this.options.el;
      this.on_enter('Edit', this.edit);
      this.on_enter('View', this.read);
      this.on_change('workflow', function(_, wf) {
        _this.attr_accessor('instance', wf);
        return _this.attr_accessor('metadata', wf);
      });
      this.release(this._release);
    }

    ModelPart.prototype.className = 'wf-step';

    ModelPart.prototype.events = function() {};

    ModelPart.prototype.elements = function() {
      return {
        '.part-name': 'el_title',
        '> div > [data-control]': 'el_controls',
        '> div > [data-property]': 'el_props',
        '> div > [data-relationship]': 'el_rels'
      };
    };

    ModelPart.prototype.non_explicit_elements = function() {
      this.elements = {
        '.part-name': 'el_title',
        '[data-control]': 'el_controls',
        '[data-property]': 'el_props',
        '[data-relationship]': 'el_rels'
      };
      if (this._el_supplied) {
        this.refreshElements();
      }
      return this;
    };

    ModelPart.prototype.template = function() {
      return "model/is/" + (this.attr('part'));
    };

    ModelPart.prototype.has_template = function() {
      return dust.cache[this.template()];
    };

    ModelPart.prototype.title = function() {
      return this.el_title.text();
    };

    ModelPart.prototype.render = function(_, context) {
      var _this = this;
      this.el.attr('id', this.attr('part'));
      if (!this._el_supplied) {
        dust.render(this.template(), context, function(err, html) {
          if (err) {
            return _this.trigger('error', err, _this);
          }
          _this.html(html);
          return _this._create_controls(context);
        });
      } else {
        this._create_controls(context);
      }
      return this;
    };

    ModelPart.prototype.read = function() {
      var control, _i, _len, _ref, _results;
      if (this.controls) {
        _ref = this.controls;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          control = _ref[_i];
          _results.push(control.read());
        }
        return _results;
      }
    };

    ModelPart.prototype.edit = function() {
      var control, _i, _len, _ref, _results;
      if (this.controls) {
        _ref = this.controls;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          control = _ref[_i];
          _results.push(control.edit());
        }
        return _results;
      }
    };

    ModelPart.prototype.clear_validations = function() {
      return this.$('.dv-property.error').removeClass('error');
    };

    ModelPart.prototype.apply_validations = function(validations) {
      var name, __;
      this.clear_validations();
      for (name in validations) {
        __ = validations[name];
        this.$("[data-property=" + name + "], [data-relationship=" + name + "]").addClass('error');
      }
      return null;
    };

    ModelPart.prototype._create_controls = function() {
      var _this = this;
      return this.with_state('Create Controls', function() {
        var el_ctl, el_prop, el_rel, _i, _j, _k, _len, _len1, _len2, _ref, _ref1, _ref2;
        _this.controls = [];
        _ref = _this.el_props;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          el_prop = _ref[_i];
          _this._add_property(el_prop);
        }
        _ref1 = _this.el_rels;
        for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
          el_rel = _ref1[_j];
          _this._add_rel(el_rel);
        }
        _ref2 = _this.el_controls;
        for (_k = 0, _len2 = _ref2.length; _k < _len2; _k++) {
          el_ctl = _ref2[_k];
          _this._add_control(el_ctl);
        }
        return null;
      });
    };

    ModelPart.prototype._add_property = function(el) {
      var control, meta, name,
        _this = this;
      name = el.dataset.property;
      meta = function() {
        var md;
        md = _this.metadata();
        if (md) {
          if (md.properties[name] != null) {
            return md.properties[name];
          } else {
            return md.displays[name];
          }
        }
      };
      if (meta()) {
        control = new Workflow[el.dataset.type || meta().type]({
          el: el,
          name: name,
          meta: meta,
          parent: this
        });
        return this.controls.push(control);
      } else {
        console.warn("No property found with name " + name);
        return $(el).remove();
      }
    };

    ModelPart.prototype._add_rel = function(el) {
      var control, meta, name,
        _this = this;
      name = el.dataset.relationship;
      meta = function() {
        var _ref;
        return (_ref = _this.metadata()) != null ? _ref.relationships[name] : void 0;
      };
      if (meta()) {
        control = new Workflow.Rel[meta().cardinality]({
          el: el,
          name: name,
          meta: meta,
          parent: this
        });
        return this.controls.push(control);
      } else {
        console.warn("No rel found with name " + name);
        return $(el).remove();
      }
    };

    ModelPart.prototype._add_control = function(el) {
      var control, name;
      name = el.dataset.control;
      if (Workflow[name]) {
        control = new Workflow[name]({
          el: el,
          parent: this
        });
        return this.controls.push(control);
      } else {
        console.warn("No control found with name " + name);
        return $(el).remove();
      }
    };

    ModelPart.prototype._release = function() {
      var c, _i, _len, _ref, _results;
      if (this.controls) {
        _ref = this.controls;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          c = _ref[_i];
          _results.push(c.release());
        }
        return _results;
      }
    };

    return ModelPart;

  })(BaseController);

}).call(this);
}, "fe/controllers/new_model": function(exports, require, module) {(function() {
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  window.NewModel = (function(_super) {

    __extends(NewModel, _super);

    NewModel.states = [
      {
        name: 'initialize',
        from: 'Initial',
        to: 'Edit'
      }, {
        name: 'create',
        from: ['Initial', 'Edit'],
        to: 'Created'
      }, {
        name: 'save',
        from: 'Edit',
        to: 'Saving'
      }, {
        name: 'saved',
        from: 'Saving',
        to: 'Redirect'
      }, {
        name: 'not_saved',
        from: 'Saving',
        to: 'Edit'
      }, {
        name: 'leave',
        from: 'Edit',
        to: 'Back'
      }
    ];

    function NewModel(model_name) {
      this.ensure_create_access = __bind(this.ensure_create_access, this);

      this._redirect = __bind(this._redirect, this);

      var inst;
      NewModel.__super__.constructor.call(this);
      this.attr('model_text', dust.filters.capitalize(model_name));
      inst = Xn.model(model_name).build();
      this.states(NewModel.states);
      this.on_enter('Redirect', this._redirect);
      this.el.addClass('create');
      this.instance(inst);
      this.on_change('metadata', this.ensure_create_access);
    }

    NewModel.prototype._redirect = function() {
      var _this = this;
      Spine.Route.navigate(this.instance().xnid());
      return setTimeout((function() {
        return main.current.apply_validations(_this.attr('validations'));
      }), 50);
    };

    NewModel.prototype.ensure_create_access = function(wf, md) {
      if (md && !md.create_access) {
        return main.bad_news("You can't create this kind of record", "If you think you should have access to create a        \"" + (md.descriptive_parts.map(function(p) {
          return dust.filters.capitalize(p);
        }).join("', '")) + "\"        record, please contact your administrator.").render();
      }
    };

    NewModel.prototype.apply_validations = function(validations) {
      return this.attr('validations', validations);
    };

    return NewModel;

  })(Model);

  window.NewModelPage = (function(_super) {

    __extends(NewModelPage, _super);

    NewModelPage.menu = function(wf) {
      return [
        {
          state: 'Edit',
          primary: {
            options: [
              {
                event: 'save',
                label: 'Save'
              }, {
                event: 'leave',
                label: 'Cancel'
              }
            ]
          }
        }
      ];
    };

    NewModelPage.include(RootWorkflow);

    function NewModelPage(model_name) {
      NewModelPage.__super__.constructor.apply(this, arguments);
      this.attr('page_type', this.attr('model_text'));
      this.attr('menu', NewModelPage.menu);
      this.topbar(new WfTopbar());
      this.on_enter('Back', function() {
        if (history.length > 1) {
          return history.back();
        } else {
          return window.close();
        }
      });
      this.title(Model.title);
      this.on_change('instance', this.update_title);
    }

    return NewModelPage;

  })(NewModel);

}).call(this);
}, "fe/controllers/new_related_model": function(exports, require, module) {(function() {
  var AssociateToSource,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  window.NewRelatedModel = (function(_super) {

    __extends(NewRelatedModel, _super);

    NewRelatedModel.states = [
      {
        name: 'initialize',
        from: 'Initial',
        to: 'NoModel'
      }, {
        name: 'select_model',
        from: 'NoModel',
        to: 'Selecting'
      }, {
        name: 'select_model',
        from: 'Edit',
        to: 'Selecting'
      }, {
        name: 'selected',
        from: 'Selecting',
        to: 'Edit'
      }
    ];

    function NewRelatedModel(opts) {
      this._notify_opener = __bind(this._notify_opener, this);

      this._select_model = __bind(this._select_model, this);

      this._models_changed = __bind(this._models_changed, this);

      this._parts_changed = __bind(this._parts_changed, this);

      this._redirect = __bind(this._redirect, this);
      NewRelatedModel.__super__.constructor.apply(this, arguments);
      this.on_change('models', this._models_changed);
      this.states(this.constructor.states);
      this.on_enter('NoModel', this.cascades('state', 'Edit'));
      this._add_model_part('choose_model');
      this.controller('choose_model').on_before('select_model', this._select_model);
      this._add_model_part('record');
      this.attr('instance', new xn.instance.Record(Xn));
      this.on_change('parts', this._parts_changed);
      this.el.addClass('create');
      this.set_rel(opts.rel_url);
    }

    NewRelatedModel.prototype._redirect = function() {
      return Spine.Route.navigate(this.instance().xnid());
    };

    NewRelatedModel.prototype.set_rel = function(rel_url) {
      var _this = this;
      if (rel_url && rel_url.length > 1) {
        this.a2s = new AssociateToSource(rel_url);
        this.link_attrs('parts', this.a2s);
        return Xn.data.get(rel_url + '/metadata', function(err, metadata) {
          var c;
          if (err) {
            return main.error(err);
          } else {
            if (metadata.models.length === 1) {
              c = main.new_model({
                model: metadata.models[0]
              });
              c.on_after('saved', _this._notify_opener);
              return _this.a2s.attr('owner', c);
            } else {
              _this.a2s.attr('owner', _this);
              _this.attr('models', metadata.models);
              _this.attr('parts', metadata.parts);
              _this.attr('metadata', metadata);
              _this._each_controller('state', 'Edit');
              return _this.render();
            }
          }
        });
      } else {
        return Xn.data.get('/model', function(err, models) {
          if (err) {
            return main.error(err);
          } else {
            return _this.attr('models', models);
          }
        });
      }
    };

    NewRelatedModel.prototype._parts_changed = function(wf, parts, n, old) {
      var type;
      if (!this.instance().model()) {
        type = Xn.partial(parts);
        this.instance().set_partial(type);
        this.trigger_change('instance');
        return this._add_parts(parts, 2);
      }
    };

    NewRelatedModel.prototype._create_controllers = function() {};

    NewRelatedModel.prototype._models_changed = function(wf, models) {
      return this.controller('choose_model').attr('model_options', models);
    };

    NewRelatedModel.prototype._select_model = function(wf, e, fr, to, model) {
      if (model) {
        return this.set_model_name(model);
      } else {
        return false;
      }
    };

    NewRelatedModel.prototype._notify_opener = function(wf) {
      var _ref, _ref1;
      return (_ref = window.opener) != null ? (_ref1 = _ref.Spine) != null ? _ref1.trigger('related_record_saved', {
        id: this.a2s.attr('source-inst').id(),
        rel_id: wf.instance().id(),
        rel_name: this.a2s.reverse_rel_name
      }) : void 0 : void 0;
    };

    NewRelatedModel.prototype.set_model_name = function(model_name) {
      var _this = this;
      this.instance().set_model(Xn.model(model_name));
      return main.set_current(function() {
        var c;
        c = new NewModelPage(model_name);
        c.on_after('saved', _this._notify_opener);
        return c.instance(_this.instance()).event('edit').render();
      });
    };

    return NewRelatedModel;

  })(Model);

  window.NewRelatedModelPage = (function(_super) {

    __extends(NewRelatedModelPage, _super);

    NewRelatedModelPage.states = NewRelatedModel.states.concat([
      {
        name: 'leave',
        from: 'Edit',
        to: 'Back'
      }
    ]);

    NewRelatedModelPage.menu = [
      {
        state: 'Edit',
        primary: {
          options: [
            {
              event: 'leave',
              label: 'Cancel'
            }
          ]
        }
      }
    ];

    NewRelatedModelPage.include(RootWorkflow);

    function NewRelatedModelPage() {
      NewRelatedModelPage.__super__.constructor.apply(this, arguments);
      this.attr('page_type', ' ');
      this.attr('menu', this.constructor.menu);
      this.topbar(new WfTopbar());
      this.on_enter('Back', function() {
        return history.back();
      });
      this.title(main.title('Create Record'));
    }

    return NewRelatedModelPage;

  })(NewRelatedModel);

  AssociateToSource = (function(_super) {

    __extends(AssociateToSource, _super);

    AssociateToSource.include(BasicWorkflow);

    function AssociateToSource(rel_url) {
      var _this = this;
      this.rel_url = rel_url;
      this._associate_to_source = __bind(this._associate_to_source, this);

      this._init_workflow();
      this.on_change('owner', function(wf, owner) {
        return _this.link_attrs('instance', owner);
      });
      this.when_all_set('owner', 'instance', 'source-rel-name', 'source-inst', this._associate_to_source);
      this._get_source_model();
      this._get_source_rel();
    }

    AssociateToSource.prototype._get_source_rel = function() {
      var other_model_name, pattern, _, _ref,
        _this = this;
      pattern = /\/model\/(\w+)\/id\/\d+\/rel\/([^\/]+)/;
      _ref = this.rel_url.match(pattern), _ = _ref[0], other_model_name = _ref[1], this.reverse_rel_name = _ref[2];
      return Xn.model(other_model_name, function(err, other_model) {
        if (err) {
          return main.error(err);
        }
        return other_model.metadata(function(err, md) {
          var rel, rev;
          if (err) {
            return main.error(err);
          }
          rel = md.relationships[_this.reverse_rel_name];
          _this.attr('parts', ['record', rel.result_part]);
          if (!rel) {
            return main.notice("Source not found", "Could not find a relationship named " + _this.reverse_rel_name + " for " + other_model_name + ".").render();
          }
          rev = rel.reverse;
          if (!rev) {
            return main.notice("Relationship is not reversible", "Could determine which relationship (if any) corresponds to " + _this.reverse_rel_name + " in " + other_model_name + ".").render();
          }
          return _this.attr('source-rel-name', rev);
        });
      });
    };

    AssociateToSource.prototype.source_xnid = function() {
      var pattern, xnid, _, _ref;
      pattern = /(\/model\/\w+\/id\/\d+)\/rel\//;
      _ref = this.rel_url.match(pattern), _ = _ref[0], xnid = _ref[1];
      return xnid;
    };

    AssociateToSource.prototype._get_source_model = function() {
      var _this = this;
      return Xn.xnid(this.source_xnid(), function(err, inst) {
        return _this.attr('source-inst', inst);
      });
    };

    AssociateToSource.prototype._associate_to_source = function(wf, owner, instance, rel_name, related) {
      var rel,
        _this = this;
      rel = instance.rel(rel_name);
      return rel.load(function(rel) {
        if (rel.read_only) {
          main.notice("Can't associate to source instance", "The relationship is read-only on this side... We may need to fix this, what behavior is expected?").render();
        } else if (rel.cardinality === 'many') {
          instance.many_rel(rel_name, {
            add: related
          });
        } else {
          instance.one_rel(rel_name, related);
        }
        return owner.render();
      });
    };

    return AssociateToSource;

  })(Spine.Module);

}).call(this);
}, "fe/controllers/no_results": function(exports, require, module) {(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  window.NoResults = (function(_super) {

    __extends(NoResults, _super);

    NoResults.include(BasicWorkflow);

    function NoResults(template) {
      NoResults.__super__.constructor.call(this);
      this._init_workflow();
      this.dust_template(template || 'search/no_results');
    }

    return NoResults;

  })(Spine.Controller);

}).call(this);
}, "fe/controllers/notes": function(exports, require, module) {(function() {
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  window.Notes = (function(_super) {

    __extends(Notes, _super);

    Notes.prototype.className = 'wf-step if-not-create';

    Notes.prototype.notesToShow = 5;

    Notes.prototype.noteDeletableFor = {
      minutes: -15
    };

    Notes.prototype.events = function() {
      return {
        'focus .note-message': '_show_focus',
        'blur  .note-message': '_hide_focus',
        'input .note-message': '_enable_with_input',
        'submit form': '_form_submitted',
        'click .note-delete': '_delete_note',
        'click .notes-show-all': 'show_all_notes'
      };
    };

    Notes.prototype.elements = function() {
      return _.extend(Notes.__super__.elements.apply(this, arguments), {
        '.note.compose': 'el_compose'
      }, {
        '.note.compose .note-controls': 'el_note_controls',
        '.note.compose .note-message': 'el_message',
        '.note.compose .save-note': 'el_save_note'
      });
    };

    function Notes() {
      this._enable_with_input = __bind(this._enable_with_input, this);

      this._hide_focus = __bind(this._hide_focus, this);

      this._show_focus = __bind(this._show_focus, this);

      this._error = __bind(this._error, this);

      this._delete_note = __bind(this._delete_note, this);

      this._show_time_notification = __bind(this._show_time_notification, this);

      this._force_reflow = __bind(this._force_reflow, this);

      this._save_successful = __bind(this._save_successful, this);

      this._save_note = __bind(this._save_note, this);

      this._form_submitted = __bind(this._form_submitted, this);

      this.render = __bind(this.render, this);

      this.show_all_notes = __bind(this.show_all_notes, this);

      this.reset_compose_form = __bind(this.reset_compose_form, this);

      this.enable_compose_form = __bind(this.enable_compose_form, this);
      Notes.__super__.constructor.apply(this, arguments);
      this._notes_seen = {};
      this._metadata_promise = Xn.model('note').p_metadata();
    }

    Notes.prototype.enable_compose_form = function(flag) {
      if (flag) {
        this.el_save_note.removeAttr('disabled');
        return this.el_message[0].dataset.hasTextContent = true;
      } else {
        this.el_save_note.attr('disabled', 'disabled');
        delete this.el_message[0].dataset.hasTextContent;
        return this.el_save_note.blur();
      }
    };

    Notes.prototype.reset_compose_form = function() {
      this.el_message.empty();
      this._force_reflow();
      return this.enable_compose_form(false);
    };

    Notes.prototype.show_all_notes = function() {
      var hiddenNotes;
      this.$('.notes-show-all').hide();
      hiddenNotes = this.$('.note.hide');
      hiddenNotes.css('opacity', 0).removeClass('hide');
      _.defer(function() {
        return hiddenNotes.css('opacity', '');
      });
      if (this._more_to_load) {
        return this._load_notes(1000);
      }
    };

    Notes.prototype.render = function(wf, context) {
      var i, inst, more_to_show, note, notes, _i, _len;
      inst = context.get('instance');
      if (!wf.instance().is_new()) {
        if (!this._notes_loaded(inst)) {
          this._load_notes();
        }
        notes = inst.rel.notes || [];
        more_to_show = false;
        this._more_to_load = inst.meta.rel_limit <= notes.length;
        for (i = _i = 0, _len = notes.length; _i < _len; i = ++_i) {
          note = notes[i];
          this._notes_seen[note.id] = true;
          if (i >= this.notesToShow) {
            note.css_class = 'hide';
            more_to_show = true;
          }
          this._decorate_with_deletable(note);
        }
        context = context.push({
          more_notes_to_show: more_to_show
        });
      }
      return Notes.__super__.render.call(this, wf, context);
    };

    Notes.prototype.render_note = function(note, after_element) {
      var el_note,
        _this = this;
      if (after_element == null) {
        after_element = 'last';
      }
      el_note = null;
      this._decorate_with_deletable(note);
      dust.render('model/is/has_notes/note', this.attr('dust_base').push(note), function(err, html) {
        el_note = $(html).css('opacity', 0);
        if (after_element === 'last') {
          _this.el.append(el_note);
        } else {
          el_note.insertAfter(after_element);
        }
        return _.defer(function() {
          return el_note.css('opacity', '');
        });
      });
      return el_note;
    };

    Notes.prototype._notes_loaded = function(inst) {
      return inst.rel.notes != null;
    };

    Notes.prototype._load_notes = function(count) {
      var notes_rel,
        _this = this;
      if (count == null) {
        count = 20;
      }
      notes_rel = this.attr('workflow').instance().rel('notes');
      return notes_rel.set_limit(count).set_format('full,properties').all().then(function(__, notes) {
        var n, _i, _len, _results;
        _results = [];
        for (_i = 0, _len = notes.length; _i < _len; _i++) {
          n = notes[_i];
          if (!_this._notes_seen[n.id]) {
            _results.push(_this.render_note(n));
          }
        }
        return _results;
      }).fail(this._error);
    };

    Notes.prototype._decorate_with_deletable = function(note) {
      if (this._is_user_author(note) && this._is_note_deletable(note)) {
        return note._deletable = true;
      }
    };

    Notes.prototype._is_user_author = function(note) {
      var _ref;
      return ((_ref = note.author_info) != null ? _ref.id : void 0) !== Xn.user.id();
    };

    Notes.prototype._is_note_deletable = function(note) {
      return Date.parse(note.created_at).isAfter(new Date().add(this.noteDeletableFor));
    };

    Notes.prototype._form_submitted = function(e) {
      e.preventDefault();
      if (this._note_promise && !this._note_promise.isComplete()) {
        return;
      }
      if (this.el_message.plainText().replace(/\s/g, '').length === 0) {
        this.el_message.focus();
        return;
      }
      return this._note_promise = this._metadata_promise.then(_.partial(this.enable_compose_form, false)).then(this._save_note).then(this._save_successful).then(this.reset_compose_form).fail(this._error);
    };

    Notes.prototype._save_note = function() {
      var new_note;
      new_note = Xn.model('note').set_format('full,properties').build();
      new_note.attr('text', this.el_message.plainText());
      new_note.one_rel('has_notes', this.instance());
      this.reset_compose_form();
      return new_note.save();
    };

    Notes.prototype._save_successful = function(id, note) {
      var el_note;
      this.el_compose.removeClass('open');
      this.el_note_controls.one($.wftransitionEvents, this._force_reflow);
      note._deletable = true;
      el_note = this.render_note(note, this.el_compose);
      return el_note.transitionEnd(_.once(_.partial(this._show_time_notification, el_note)));
    };

    Notes.prototype._force_reflow = function() {
      var _this = this;
      this.el_compose.css('height', '100px');
      return _.defer(function() {
        return _this.el_compose.css('height', '');
      });
    };

    Notes.prototype._show_time_notification = function(el_note) {
      var el_delete;
      el_delete = $(el_note).find('.note-delete');
      el_delete.tooltip({
        html: true,
        title: 'This note can be deleted for the next 15 minutes',
        trigger: 'manual'
      });
      el_delete.tooltip('show');
      return _.delay((function() {
        return el_delete.tooltip('destroy');
      }), 3000);
    };

    Notes.prototype._delete_note = function(e) {
      var el_note, note_id,
        _this = this;
      e.preventDefault();
      if (window.confirm('Are you sure you want to delete the note?')) {
        el_note = $(e.target).closest('[data-id]');
        note_id = el_note.data('id');
        return Xn.model('note').with_id(note_id).action('delete_note', {}, function(err) {
          if (err) {
            return _this._error(err);
          } else {
            return el_note.css('opacity', 0).transitionEnd(function() {
              return el_note.remove();
            });
          }
        });
      }
    };

    Notes.prototype._error = function(e) {
      if (this.attr('workflow').error != null) {
        return this.attr('workflow').error(e);
      } else {
        return console.error('Save failed', e);
      }
    };

    Notes.prototype._show_focus = function() {
      return this.el_compose.addClass('open focused');
    };

    Notes.prototype._hide_focus = function() {
      return this.el_compose.removeClass('focused');
    };

    Notes.prototype._enable_with_input = function() {
      return this.enable_compose_form(!!this.el_message[0].textContent);
    };

    return Notes;

  })(ModelPart);

}).call(this);
}, "fe/controllers/notifications": function(exports, require, module) {(function() {
  var NotificationsList,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  window.NotificationsManager = (function(_super) {
    var LEVEL_TO_PRECENDENCE, PRECENDENCE_TO_LEVEL, k, v;

    __extends(NotificationsManager, _super);

    NotificationsManager.include(Spine.Events);

    LEVEL_TO_PRECENDENCE = {
      none: 0,
      success: 1,
      warning: 2,
      danger: 3
    };

    PRECENDENCE_TO_LEVEL = {};

    for (k in LEVEL_TO_PRECENDENCE) {
      v = LEVEL_TO_PRECENDENCE[k];
      PRECENDENCE_TO_LEVEL[v] = k;
    }

    function NotificationsManager() {
      this.determine_level = __bind(this.determine_level, this);
      this.notifications = ko.observableArray();
      this.notification_count = ko.observable(0);
      this.level = ko.observable();
    }

    NotificationsManager.prototype.add_notification = function(title, level) {
      return this._add_notification(new Notification(title, level));
    };

    NotificationsManager.prototype.add_job_notification = function(job, title) {
      if (title == null) {
        title = job.attr('action_name');
      }
      return this._add_notification(new JobNotification(title, job.xnid(), job.attr('status'), job));
    };

    NotificationsManager.prototype._add_notification = function(ntf) {
      this.notifications.push(ntf);
      this.notification_count(this.notifications().length);
      ntf.level.subscribe(this.determine_level);
      this.determine_level();
      return ntf;
    };

    NotificationsManager.prototype.remove_at_index = function(idx) {
      this.notifications.splice(idx, 1);
      return this._invalidate();
    };

    NotificationsManager.prototype.clear = function() {
      this.notifications.remove(function(ntf) {
        return ntf.is_clearable();
      });
      return this._invalidate();
    };

    NotificationsManager.prototype._invalidate = function() {
      this.notification_count(this.notifications().length);
      return this.determine_level();
    };

    NotificationsManager.prototype.determine_level = function() {
      var p;
      p = _.reduce(this.notifications(), function(memo, ntf) {
        var ntf_level;
        ntf_level = LEVEL_TO_PRECENDENCE[ntf.level()];
        if (ntf_level > memo) {
          return ntf_level;
        } else {
          return memo;
        }
      }, 0);
      return this.level(PRECENDENCE_TO_LEVEL[p]);
    };

    return NotificationsManager;

  })(Spine.Class);

  window.NotificationIndicator = (function(_super) {

    __extends(NotificationIndicator, _super);

    NotificationIndicator.prototype.events = {
      'click': 'clicked'
    };

    NotificationIndicator.prototype.elements = {
      '.notifications-btn-content': 'el_state_btns'
    };

    function NotificationIndicator(options) {
      this.on_user_changed = __bind(this.on_user_changed, this);

      this.render = __bind(this.render, this);

      this.notification_state_changed = __bind(this.notification_state_changed, this);
      NotificationIndicator.__super__.constructor.apply(this, arguments);
      this.setup_manager();
      this.setup_list();
      this.is_active = false;
      this.new_state_button(0, 'none');
      this.on_user_changed(Xn.user);
      Spine.bind('user:changed', this.on_user_changed);
      this.invalidated = false;
    }

    NotificationIndicator.prototype.setup_manager = function() {
      this.mgr.notification_count.subscribe(this.notification_state_changed);
      return this.mgr.level.subscribe(this.notification_state_changed);
    };

    NotificationIndicator.prototype.setup_list = function() {
      var _this = this;
      this.list = new NotificationsList({
        mgr: this.options.mgr
      });
      this.popover = new Popover({
        el: $('.notifications-popover', this.el.parent('.notifications')),
        content: this.list,
        title: 'Notifications',
        side: 'center',
        close: '',
        layout_class: '',
        reposition: function() {},
        should_click_dismiss: function(e) {
          if (_this.is_descendant($(e.target)) || !_this.list.should_click_dismiss(e)) {
            return false;
          } else {
            return true;
          }
        }
      });
      this.popover.bind('hide', function() {
        _this.is_active = false;
        return _this.el_state_btns.removeClass('active');
      });
      this.list.popover = this.popover;
      return $('body').append(this.popover.el);
    };

    NotificationIndicator.prototype.notification_state_changed = function(new_count) {
      return this.invalidate();
    };

    NotificationIndicator.prototype.invalidate = function() {
      if (this.invalidated) {
        return;
      }
      this.invalidated = true;
      return this.delay(this.render);
    };

    NotificationIndicator.prototype.render = function() {
      this.rotate_to(this.mgr.notification_count(), this.mgr.level());
      return this.invalidated = false;
    };

    NotificationIndicator.prototype.on_user_changed = function(user) {
      if (user != null) {
        return this.el.show();
      } else {
        return this.el.hide();
      }
    };

    NotificationIndicator.prototype.rotate_to = function(count, level) {
      var old_state_position, position, _ref,
        _this = this;
      _ref = level === 'none' ? ['below', 'above'] : ['above', 'below'], position = _ref[0], old_state_position = _ref[1];
      return this.new_state_button(count, level, position, function(err, btn) {
        var old_btn;
        old_btn = _this.el_state_btns.not(btn);
        old_btn.transitionEnd(function(e) {
          return old_btn.remove();
        });
        return _this.delay(function() {
          btn.removeClass(position);
          return old_btn.addClass(old_state_position);
        });
      });
    };

    NotificationIndicator.prototype.clicked = function(e) {
      this.el_state_btns.toggleClass('active');
      this.is_active = !this.is_active;
      this.popover.toggle();
      return null;
    };

    NotificationIndicator.prototype.new_state_button = function(count, level, position, callback) {
      var ctx,
        _this = this;
      ctx = {
        count: count,
        level_class: level === 'none' ? '' : "btn-" + level,
        active_class: this.is_active ? 'active' : '',
        position_class: position != null ? position : ''
      };
      return dust.render('notification/state_button', ctx, function(err, html) {
        var btn;
        if (err) {
          if (callback != null) {
            callback(err);
            return;
          } else {
            throw err;
          }
        }
        _this.append(btn = $(html));
        if (callback) {
          return callback(err, btn);
        }
      });
    };

    return NotificationIndicator;

  })(BaseController);

  NotificationsList = (function(_super) {

    __extends(NotificationsList, _super);

    NotificationsList.prototype.className = 'notifications-list';

    NotificationsList.prototype.events = {
      'click .clear': 'clear_clicked',
      'click .close': 'remove_clicked'
    };

    function NotificationsList(options) {
      this.render = __bind(this.render, this);

      this.should_click_dismiss = __bind(this.should_click_dismiss, this);

      this.remove_clicked = __bind(this.remove_clicked, this);

      this.clear_clicked = __bind(this.clear_clicked, this);
      NotificationsList.__super__.constructor.apply(this, arguments);
      this.mgr.notifications.subscribe(this.render);
      this.render();
    }

    NotificationsList.prototype.clear_clicked = function(e) {
      return this.mgr.clear();
    };

    NotificationsList.prototype.remove_clicked = function(e) {
      var idx;
      idx = $(e.target).parents('.notification').prevAll('.notification').length;
      return this.mgr.remove_at_index(idx);
    };

    NotificationsList.prototype.should_click_dismiss = function(e) {
      return !$(e.target).is('.clear, .close');
    };

    NotificationsList.prototype.render = function(notifications) {
      var ntf, ntfs,
        _this = this;
      this.el.html('');
      if (notifications) {
        ntfs = (function() {
          var _i, _len, _results;
          _results = [];
          for (_i = 0, _len = notifications.length; _i < _len; _i++) {
            ntf = notifications[_i];
            _results.push(ntf.to_dust_ctx());
          }
          return _results;
        })();
      }
      return dust.render('notification/notifications_list', {
        notifications: ntfs
      }, function(err, html) {
        if (err) {
          throw err;
        }
        return _this.append($(html));
      });
    };

    NotificationsList.prototype.is_visible = function() {
      return this.el.is(':visible');
    };

    return NotificationsList;

  })(Spine.Controller);

}).call(this);
}, "fe/controllers/popover": function(exports, require, module) {(function() {
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  window.Popover = (function(_super) {

    __extends(Popover, _super);

    Popover.open_popovers = function() {
      return $('body > .popover.visible');
    };

    Popover.prototype.className = 'popover';

    Popover.prototype.elements = {
      '.popover-title': 'el_title',
      '.popover-content': 'el_content',
      '.popover-inner': 'el_inner',
      '.popover-actions': 'el_actions',
      '.popover-controls': 'el_controls',
      '.popover-controls button': 'el_buttons',
      '> .arrow': 'el_arrow'
    };

    Popover.prototype.events = {
      'click [data-event]': 'button_click'
    };

    Popover.prototype.close = '&times;';

    Popover.prototype.side = 'right';

    function Popover() {
      this.button_click = __bind(this.button_click, this);

      this.page_element_clicked = __bind(this.page_element_clicked, this);

      this.hide_if_escape_pressed = __bind(this.hide_if_escape_pressed, this);

      this._on_scroll = __bind(this._on_scroll, this);

      this.toggle = __bind(this.toggle, this);

      this.disable_buttons = __bind(this.disable_buttons, this);

      this.hide = __bind(this.hide, this);

      this.show = __bind(this.show, this);

      var context, _ref,
        _this = this;
      Popover.__super__.constructor.apply(this, arguments);
      this.body = $('body');
      this._setup_hide_handlers();
      context = this.attr('dust_base').push({
        title: this.title,
        close: this.close,
        buttons: this._prepare_buttons(this.buttons),
        has_actions: (this.action_content != null) || (((_ref = this.controller) != null ? _ref.action_content : void 0) != null)
      });
      dust.render('popover', context, function(err, html) {
        if (err) {
          return _this.trigger('error', err);
        }
        _this.html(html);
        _this.set_side(_this.side);
        _this.set_layout_class(_this.layout_class);
        _this.set_anchor(_this.anchor);
        if (_this.controller) {
          _this.set_controller(_this.controller);
          return _this.add_title_content(_this.in_title);
        } else {
          _this.set_content(_this.content);
          if (_this.action_content) {
            _this.set_action_content(_this.action_content);
          }
          return _this.add_title_content(_this.in_title);
        }
      });
    }

    Popover.prototype.show = function(e) {
      var _ref,
        _this = this;
      if (e != null) {
        e.preventDefault();
      }
      if (!this.visible) {
        if (this.rendered) {
          this.reposition();
        } else {
          this.render();
        }
        this.visible = true;
        this.el.show();
        this.el_arrow.show();
        if ((_ref = this.anchor) != null) {
          _ref.addClass('active');
        }
        this.body.addClass('popover-open');
        this._disable_container_scroll();
        this._start_scroll_watch();
        this.trigger('show');
        _.defer(function() {
          return _this.el.addClass('visible');
        });
      }
      return this;
    };

    Popover.prototype.hide = function(e) {
      var open_popovers, _ref;
      if (e != null) {
        e.preventDefault();
      }
      if (e != null) {
        e.stopPropagation();
      }
      if (this.visible) {
        this.visible = false;
        this.el.removeClass('visible');
        open_popovers = Popover.open_popovers();
        if (!open_popovers.length) {
          this.body.removeClass('popover-open');
        }
        if ((_ref = this.anchor) != null) {
          _ref.removeClass('active');
        }
        this._enable_container_scroll();
        this._stop_scroll_watch();
        this.trigger('hide');
      }
      return this;
    };

    Popover.prototype.disable_buttons = function(disabled) {
      if (disabled) {
        this.el_buttons.attr('disabled', '');
      } else {
        this.el_buttons.removeAttr('disabled');
      }
      return this;
    };

    Popover.prototype.toggle = function(event_or_flag) {
      var flag;
      if (event_or_flag != null) {
        if (typeof event_or_flag.preventDefault === "function") {
          event_or_flag.preventDefault();
        }
      }
      flag = (event_or_flag != null) && _.isBoolean(event_or_flag) ? event_or_flag : !this.visible;
      if (flag) {
        return this.show();
      } else {
        return this.hide();
      }
    };

    Popover.prototype.set_anchor = function(anchor) {
      this.anchor = anchor;
      return this.reposition();
    };

    Popover.prototype.set_layout_class = function(layout_class) {
      this.layout_class = layout_class;
      return this.el.addClass(this.layout_class);
    };

    Popover.prototype.set_side = function(side) {
      this.side = side;
      this.el.removeClass('left right center bottom bottom-left bottom-right');
      this.el.addClass(side);
      if (side === 'center' && !(this.layout_class != null)) {
        this.set_layout_class('popover-layout-centered');
      }
      return this.reposition();
    };

    Popover.prototype.set_controller = function(controller) {
      this.controller = controller;
      this.set_content(controller.el);
      if (controller.action_content != null) {
        this.set_action_content(controller.action_content());
      } else if (this.action_content) {
        this.set_action_content(this.action_content);
      }
      return typeof controller.added_to_window === "function" ? controller.added_to_window() : void 0;
    };

    Popover.prototype.set_content = function(content) {
      var in_title;
      if (content.el) {
        content = content.el;
      }
      this.el_content.remove('> *', true);
      this.el_content.append(content);
      in_title = content.find('> .in-title');
      if (in_title.length) {
        this.add_title_content(in_title);
      }
      return this.reposition();
    };

    Popover.prototype.set_action_content = function(action_content) {
      this.action_content = action_content;
      return this.el_actions.empty().append(this.action_content);
    };

    Popover.prototype.add_title_content = function(content) {
      if (content) {
        if (content.el) {
          content = content.el;
        }
        this.el_title.append(content);
        content.show();
        return this.reposition();
      }
    };

    Popover.prototype._scrollable_parents = function() {
      return this.anchor.parents('.scrollable');
    };

    Popover.prototype._start_scroll_watch = function() {
      if (!this.anchor) {
        return;
      }
      this._stop_scroll_watch();
      this._scroll_watchables = $(window).add(this._scrollable_parents());
      return this.releasing_bind(this._scroll_watchables, 'scroll resize', this._on_scroll);
    };

    Popover.prototype._stop_scroll_watch = function() {
      if (!this._scroll_watchables) {
        return;
      }
      return this._scroll_watchables.unbind('scroll resize', this._on_scroll);
    };

    Popover.prototype._on_scroll = function(e) {
      return this.reposition();
    };

    Popover.prototype._disable_container_scroll = function() {
      if (!this.prevent_container_scroll || !this.anchor) {
        return;
      }
      this.anchor[0].dataset.popoverAnchor = true;
      return this._scrollable_parents().css('overflow', 'hidden');
    };

    Popover.prototype._enable_container_scroll = function() {
      var scroller, _i, _len, _ref, _results;
      if (!this.prevent_container_scroll || !this.anchor) {
        return;
      }
      delete this.anchor[0].dataset.popoverAnchor;
      _ref = this._scrollable_parents();
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        scroller = _ref[_i];
        scroller = $(scroller);
        if (!scroller.find('[data-popover-anchor]').empty()) {
          break;
        }
        _results.push(scroller.css('overflow', ''));
      }
      return _results;
    };

    Popover.prototype.render = function() {
      this.rendered = true;
      this.body.append(this.el);
      if (this.prevent_container_scroll) {
        this.el[0].dataset.preventBodyScroll = this.prevent_container_scroll;
      }
      return this.reposition();
    };

    Popover.prototype.reposition = function() {
      var a_left, a_top, arrow_top, popover_left, popover_top, _ref;
      if (!this.rendered) {
        return;
      }
      switch (this.side) {
        case 'center':
          break;
        case 'left':
        case 'right':
        case 'bottom-left':
        case 'bottom':
          _ref = this.anchor.offset(), a_top = _ref.top, a_left = _ref.left;
          arrow_top = (function() {
            switch (this.side) {
              case 'bottom':
                return -10;
              case 'left':
              case 'right':
                return this.el.height() / 2;
              case 'bottom-left':
              case 'bottom-right':
                return 75;
            }
          }).call(this);
          popover_top = (function() {
            switch (this.side) {
              case 'bottom':
                return a_top + this.anchor.height() + 10;
              case 'left':
              case 'right':
                return a_top - this.el.height() / 2 + this.anchor.height() / 2;
              case 'bottom-left':
              case 'bottom-right':
                return a_top - 70 + this.anchor.height() / 2;
            }
          }).call(this);
          popover_left = (function() {
            switch (this.side) {
              case 'bottom':
                return a_left - this.el.width() / 2 + this.anchor.width() / 2;
              case 'left':
              case 'bottom-left':
                return a_left - this.el.width();
              case 'right':
              case 'bottom-right':
                return a_left + this.anchor.outerWidth();
            }
          }).call(this);
          this.el.css({
            left: popover_left,
            top: popover_top
          });
          return this.el_arrow.css('top', arrow_top);
      }
    };

    Popover.prototype.hide_if_escape_pressed = function(e) {
      if (e.keyCode !== 27) {
        return;
      }
      return this.hide();
    };

    Popover.prototype.page_element_clicked = function(e) {
      if (!this.visible || this.is_descendant(e.target, this.el) || ((this.should_click_dismiss != null) && !this.should_click_dismiss(e))) {
        return;
      }
      return this.hide();
    };

    Popover.prototype.button_click = function(e) {
      e.stopPropagation();
      switch (e.currentTarget.dataset.event) {
        case 'hide':
          return this.hide();
        default:
          return this.trigger(e.currentTarget.dataset.event);
      }
    };

    Popover.prototype._prepare_buttons = function(buttons) {
      _.each(buttons, function(btn) {
        if (btn.form instanceof jQuery) {
          return btn.form = btn.form.attr('id');
        }
      });
      return buttons;
    };

    Popover.prototype._setup_hide_handlers = function() {
      this.body.keydown(this.hide_if_escape_pressed);
      return this.body.click(this.page_element_clicked);
    };

    return Popover;

  })(BaseController);

}).call(this);
}, "fe/controllers/report/blueprint": function(exports, require, module) {(function() {
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  window.BlueprintReportPage = (function(_super) {

    __extends(BlueprintReportPage, _super);

    function BlueprintReportPage() {
      this.dust_context = __bind(this.dust_context, this);

      this.dust_base = __bind(this.dust_base, this);

      this.run_switch_reports = __bind(this.run_switch_reports, this);

      this.load_interfaces_and_switch_configs = __bind(this.load_interfaces_and_switch_configs, this);

      this._instance_changed = __bind(this._instance_changed, this);
      return BlueprintReportPage.__super__.constructor.apply(this, arguments);
    }

    BlueprintReportPage.register_report_controller('service_design_package', 'blueprint');

    BlueprintReportPage.prototype._with_comments_format = 'full,properties';

    BlueprintReportPage.prototype._instance_changed = function(wf, inst) {
      return kew.all([this.load_sdp_rels(inst), this.load_full_projects(inst), this.load_full_systems(inst), this.load_full_devices(), this.load_requirement_type_info(), Xn.model('switch_port').p_metadata()]).then(this.load_interfaces_and_switch_configs).then(this.report_data_loaded).fail(this.error);
    };

    BlueprintReportPage.prototype.load_sdp_rels = function(inst) {
      var _this = this;
      return Xn.is(['record', 'service_design_package', 'has_notes']).p_metadata().then(function() {
        return _this.load_with_record_part(['service_design_package', 'has_notes'], {
          records: [inst]
        });
      }).then(function() {
        var notes_promise, rel, reqs_promise;
        rel = inst.partial().relationship('notes');
        notes_promise = rel.for_record(inst).set_format('properties').set_rel_limit(500).all();
        rel = inst.partial().relationship('requirements');
        reqs_promise = rel.for_record(inst).set_rel_limit(500).all();
        return kew.all([notes_promise, reqs_promise]);
      });
    };

    BlueprintReportPage.prototype.load_full_projects = function(inst) {
      return this.load_with_record_part(['project', 'has_notes'], {
        records: inst.one_rel('project'),
        format: this._with_comments_format,
        rel_limit: 500
      });
    };

    BlueprintReportPage.prototype.load_full_systems = function(inst) {
      return this.load_with_record_part(['system', 'has_notes'], {
        records: inst.many_rel('systems'),
        format: this._with_comments_format,
        rel_limit: 500
      });
    };

    BlueprintReportPage.prototype.load_full_devices = function() {
      var device, devices, inst, system, _i, _j, _len, _len1, _ref, _ref1,
        _this = this;
      inst = this.instance();
      devices = [];
      _ref = inst.many_rel('systems');
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        system = _ref[_i];
        _ref1 = system.many_rel('network_devices');
        for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
          device = _ref1[_j];
          devices.push(device);
        }
      }
      return kew.all(_.map(devices, function(device) {
        return device.refresh_with_format(_this._with_comments_format);
      }));
    };

    BlueprintReportPage.prototype.load_requirement_type_info = function() {
      var _this = this;
      return Xn.is('requirement').p_metadata().then(function() {
        return Xn.is('requirement').report('type_information', null).all();
      }).then(function(req_type_info) {
        _this.req_type_info = req_type_info;
      });
    };

    BlueprintReportPage.prototype.load_interfaces_and_switch_configs = function() {
      var ids, not_found_handler,
        _this = this;
      ids = this.interface_ids();
      not_found_handler = function(err) {
        if (err === 'Not Found') {
          return kew.resolve([]);
        }
      };
      return kew.all([
        this.load_with_record_part('interface', {
          ids: ids
        }).fail(not_found_handler), this.load_with_record_part('port', {
          ids: ids
        }).fail(not_found_handler), this.load_switch_configs(ids)
      ]);
    };

    BlueprintReportPage.prototype.load_switch_configs = function(interface_ids) {
      var base_url, p, url;
      if (interface_ids && interface_ids.length) {
        base_url = Xn.model('interface').search(interface_ids).url();
        url = "" + base_url + "/rel/cable/rel/plugged_in/is/switch_port/path_properties/display_name///_id";
        p = kew.defer();
        Xn.data.get(url, p.makeNodeResolver());
        return p.then(_.compose(this.run_switch_reports, this.extract_switch_infos));
      } else {
        return kew.resolve();
      }
    };

    BlueprintReportPage.prototype.extract_switch_infos = function(path_properties) {
      var id, name, __, _i, _len, _ref, _ref1, _ref2, _results;
      _results = [];
      for (_i = 0, _len = path_properties.length; _i < _len; _i++) {
        _ref = path_properties[_i], (_ref1 = _ref[0], name = _ref1[0]), __ = _ref[1], __ = _ref[2], (_ref2 = _ref[3], id = _ref2[0]);
        _results.push([name, id]);
      }
      return _results;
    };

    BlueprintReportPage.prototype.run_switch_reports = function(switch_infos) {
      var ifaces, port_ids,
        _this = this;
      this.switch_configs = [];
      ifaces = _.pluck(switch_infos, 0);
      port_ids = _.pluck(switch_infos, 1);
      if (port_ids && port_ids.length) {
        return Xn.model('switch_port').search(port_ids).report('switch_config_code', null).all().then(function(switch_configs) {
          var pair, _i, _len, _ref, _results;
          _ref = _.zip(ifaces, switch_configs);
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            pair = _ref[_i];
            _results.push(_this.switch_configs.push({
              "interface": pair[0],
              code: pair[1]
            }));
          }
          return _results;
        });
      }
    };

    BlueprintReportPage.prototype.interface_ids = function() {
      var device, inst, intr, results, system;
      inst = this.instance();
      results = (function() {
        var _i, _len, _ref, _ref1, _results;
        _ref1 = (_ref = inst.many_rel('systems')) != null ? _ref : [];
        _results = [];
        for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
          system = _ref1[_i];
          _results.push((function() {
            var _j, _len1, _ref2, _ref3, _results1;
            _ref3 = (_ref2 = system.many_rel('network_devices')) != null ? _ref2 : [];
            _results1 = [];
            for (_j = 0, _len1 = _ref3.length; _j < _len1; _j++) {
              device = _ref3[_j];
              _results1.push((function() {
                var _k, _len2, _ref4, _ref5, _results2;
                _ref5 = (_ref4 = device.many_rel('interfaces')) != null ? _ref4 : [];
                _results2 = [];
                for (_k = 0, _len2 = _ref5.length; _k < _len2; _k++) {
                  intr = _ref5[_k];
                  _results2.push(intr.id());
                }
                return _results2;
              })());
            }
            return _results1;
          })());
        }
        return _results;
      })();
      return _.flatten(results);
    };

    BlueprintReportPage.prototype.interface_table_batch_size = function() {
      switch (this.paper_size) {
        case 'ledger':
          return 40;
        default:
          return 27;
      }
    };

    BlueprintReportPage.prototype.dust_base = function() {
      return BlueprintReportPage.TemplateHelpers.make(Xn, this.req_type_info);
    };

    BlueprintReportPage.prototype.dust_context = function() {
      var ctx, device, inst, interfaces, intr, system;
      ctx = BlueprintReportPage.__super__.dust_context.apply(this, arguments);
      if (this._report_data_loaded) {
        inst = ctx.get('instance');
        interfaces = (function() {
          var _i, _len, _ref, _ref1, _results;
          _ref1 = (_ref = inst.rel.systems) != null ? _ref : [];
          _results = [];
          for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
            system = _ref1[_i];
            _results.push((function() {
              var _j, _len1, _ref2, _ref3, _results1;
              _ref3 = (_ref2 = system.rel.network_devices) != null ? _ref2 : [];
              _results1 = [];
              for (_j = 0, _len1 = _ref3.length; _j < _len1; _j++) {
                device = _ref3[_j];
                _results1.push((function() {
                  var _k, _len2, _ref4, _ref5, _results2;
                  _ref5 = (_ref4 = device.rel.interfaces) != null ? _ref4 : [];
                  _results2 = [];
                  for (_k = 0, _len2 = _ref5.length; _k < _len2; _k++) {
                    intr = _ref5[_k];
                    _results2.push(intr);
                  }
                  return _results2;
                })());
              }
              return _results1;
            })());
          }
          return _results;
        })();
        return ctx.push({
          all_interfaces: _.flatten(interfaces),
          interface_table_batch_size: this.interface_table_batch_size(),
          switch_configs: this.switch_configs
        });
      } else {
        return ctx;
      }
    };

    BlueprintReportPage.TemplateHelpers = (function(_super1) {

      __extends(TemplateHelpers, _super1);

      TemplateHelpers.prototype.note_created_at_filter = 'short';

      TemplateHelpers.prototype.filtered_relationships = {
        systems: true,
        external_records: true,
        interfaces: true,
        switch_ports: true
      };

      function TemplateHelpers(app, req_type_info) {
        this.app = app;
        this.req_type_info = req_type_info;
        this.organize_requirements = __bind(this.organize_requirements, this);

        TemplateHelpers.__super__.constructor.apply(this, arguments);
        if (this.req_type_info) {
          this.generate_sort_order();
        }
      }

      TemplateHelpers.prototype.generate_sort_order = function() {
        var i, info, _i, _len, _ref;
        this.req_type_ordinals = {};
        _ref = this.req_type_info;
        for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
          info = _ref[i];
          this.req_type_ordinals[info.name] = i;
        }
        return null;
      };

      TemplateHelpers.prototype.organize_requirements = function(c, ctx, blocks, options) {
        var child_ctx, i, last_type, req, reqs, _i, _len;
        reqs = this.sort_requirements(this.filter_requirements(ctx.current()));
        last_type = null;
        for (i = _i = 0, _len = reqs.length; _i < _len; i = ++_i) {
          req = reqs[i];
          child_ctx = ctx.push(req, i, reqs.length);
          if (req.type !== last_type) {
            child_ctx = child_ctx.push({
              requirement_type: req.type
            });
            last_type = req.type;
          }
          c.render(blocks.block, child_ctx);
        }
      };

      TemplateHelpers.prototype.filter_requirements = function(reqs) {
        return _.select(reqs, function(req) {
          return !req.deleted;
        });
      };

      TemplateHelpers.prototype.sort_requirements = function(reqs) {
        var ordinal_sort, type_sort,
          _this = this;
        type_sort = function(a, b) {
          return _this.req_type_ordinals[a.type] - _this.req_type_ordinals[b.type];
        };
        ordinal_sort = function(a, b) {
          return parseInt(a.display_name.split('-')[1]) - parseInt(b.display_name.split('-')[1]);
        };
        reqs.sort(xn.support.multi_sorter(type_sort, ordinal_sort));
        return reqs;
      };

      return TemplateHelpers;

    })(ReportPage.TemplateHelpers);

    return BlueprintReportPage;

  }).call(this, ReportPage);

}).call(this);
}, "fe/controllers/report/table_of_contents": function(exports, require, module) {(function() {
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  window.TableOfContents = (function(_super) {

    __extends(TableOfContents, _super);

    function TableOfContents(options) {
      this.render_toc = __bind(this.render_toc, this);
      TableOfContents.__super__.constructor.call(this, options);
      this.headers_to_index || (this.headers_to_index = [1, 2, 3, 4, 5, 6]);
      this.prepend_sections_to_headers || (this.prepend_sections_to_headers = true);
      this.on_render(this.render_toc);
    }

    TableOfContents.prototype.build_toc = function() {
      var counters, ele, header_sel, header_type, i, label, root, section, _i, _len, _ref, _results;
      root = $(this.toc_source_selector);
      header_sel = ((function() {
        var _i, _len, _ref, _results;
        _ref = this.headers_to_index;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          i = _ref[_i];
          _results.push("h" + i);
        }
        return _results;
      }).call(this)).join(', ');
      counters = (function() {
        var _i, _len, _ref, _results;
        _ref = this.headers_to_index;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          i = _ref[_i];
          _results.push(0);
        }
        return _results;
      }).call(this);
      _ref = root.find(header_sel);
      _results = [];
      for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
        ele = _ref[i];
        ele = $(ele);
        if (ele.attr('data-no-toc') != null) {
          continue;
        }
        header_type = parseInt(ele.prop('tagName').match(/(\d)/)[0]);
        this.increment_counters(counters, header_type);
        section = this.section_from_counters(counters);
        label = ele.data('toc-header') || ele.text();
        ele.attr('id', "toc-" + i);
        if (this.prepend_sections_to_headers) {
          ele.text("" + section + ". " + (ele.text()));
        }
        _results.push({
          label: label,
          href: "#toc-" + i,
          depth: header_type,
          section: section
        });
      }
      return _results;
    };

    TableOfContents.prototype.increment_counters = function(counters, header_type) {
      var i, _i, _ref, _ref1;
      header_type -= 1;
      counters[header_type] += 1;
      for (i = _i = _ref = header_type + 1, _ref1 = counters.length; _ref <= _ref1 ? _i < _ref1 : _i > _ref1; i = _ref <= _ref1 ? ++_i : --_i) {
        counters[i] = 0;
      }
      return counters;
    };

    TableOfContents.prototype.section_from_counters = function(counters) {
      var first_0;
      first_0 = _.indexOf(counters, 0);
      if (first_0 === -1) {
        first_0 = counters.length;
      }
      return counters.slice(0, first_0).join('.');
    };

    TableOfContents.prototype.template = function() {
      return 'report/toc';
    };

    TableOfContents.prototype.dust_context = function() {
      return this.attr('dust_base').push({
        toc: this.build_toc()
      });
    };

    TableOfContents.prototype.render_toc = function() {
      var _this = this;
      return dust.render(this.template(), this.dust_context(), function(err, html) {
        return _this.html(html);
      });
    };

    return TableOfContents;

  })(BaseController);

}).call(this);
}, "fe/controllers/report_page": function(exports, require, module) {(function() {
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  window.ReportPage = (function(_super) {

    __extends(ReportPage, _super);

    ReportPage.include(RootWorkflow);

    ReportPage.include(BranchWorkflow);

    ReportPage.register_report_controller = function(part, report_name) {
      var cls = this;;
      ReportPage.controller_registry || (ReportPage.controller_registry = {});
      return ReportPage.controller_registry["" + part + "/" + report_name] = cls;
    };

    ReportPage.get = function(part, report_name) {
      var _ref;
      return ((_ref = this.controller_registry) != null ? _ref["" + part + "/" + report_name] : void 0) || ReportPage;
    };

    ReportPage.title = function(wf) {
      if (wf.instance()) {
        return "" + (wf.instance().attr('display_name')) + " - " + (dust.filters.humanize(wf.attr('report_name'))) + " - LightMesh CMDB";
      } else {
        return "Loading report... - LightMesh CMDB";
      }
    };

    ReportPage.prototype.className = 'report-container';

    ReportPage.prototype.elements = {
      '.report': 'report',
      '.report .toc': 'toc_container',
      '.report .model-page': 'model_containers',
      '.btn-print': 'print_btn',
      '.paper-size button': 'paper_sizes'
    };

    ReportPage.prototype.events = {
      'click .btn-print': 'print',
      'click .paper-size button': 'change_paper_size',
      'click .rotate-tables button': 'rotate_tables'
    };

    function ReportPage(_arg) {
      var part, report_name;
      part = _arg.part, report_name = _arg.report_name;
      this.release_controllers = __bind(this.release_controllers, this);

      this._render = __bind(this._render, this);

      this.dust_context = __bind(this.dust_context, this);

      this.child_dust_base = __bind(this.child_dust_base, this);

      this.dust_base = __bind(this.dust_base, this);

      this.report_data_loaded = __bind(this.report_data_loaded, this);

      this.error = __bind(this.error, this);

      this.print = __bind(this.print, this);

      this.print_element = __bind(this.print_element, this);

      this.rotate_tables = __bind(this.rotate_tables, this);

      this.change_paper_size = __bind(this.change_paper_size, this);

      this._instance_changed = __bind(this._instance_changed, this);

      ReportPage.__super__.constructor.apply(this, arguments);
      this.paper_size = 'letter';
      this._report_data_loaded = false;
      this.title(ReportPage.title);
      this.attr('part', part);
      this.attr('toc_options', {
        toc_source_selector: '.report .toc-source',
        headers_to_index: [1, 2, 3]
      });
      this.attr('report_name', report_name);
      this.on_change('instance', this.update_title);
      this.on_change('instance', this._instance_changed);
      this.on_render(this._render);
      this.release(this.release_controllers);
    }

    ReportPage.prototype._instance_changed = function(wf, inst) {
      var type,
        _this = this;
      type = inst != null ? inst.type() : void 0;
      return type != null ? type.metadata(function(err, metadata) {
        _this.attr('metadata', metadata);
        _this.report_data_loaded = true;
        return _this.render();
      }) : void 0;
    };

    ReportPage.prototype.change_paper_size = function(e) {
      this.paper_size = $(e.target).val();
      this.report[0].dataset.paperSize = this.paper_size;
      return this.render();
    };

    ReportPage.prototype.rotate_tables = function(e) {
      return this.report[0].dataset.rotateTables = $(e.target).val();
    };

    ReportPage.prototype.print_element = function() {
      return this.report;
    };

    ReportPage.prototype.print = function() {
      return ReportPage.__super__.print.call(this, {
        paper_size: this.paper_size
      });
    };

    ReportPage.prototype.load_with_record_part = function(parts_or_part, _arg) {
      var format, ids, partial, parts, records, rel_limit;
      records = _arg.records, ids = _arg.ids, format = _arg.format, rel_limit = _arg.rel_limit;
      ids || (ids = _.isArray(records) ? _.map(records, function(rec) {
        return rec.id();
      }) : [records.id()]);
      parts = _.isArray(parts_or_part) ? parts_or_part : [parts_or_part];
      if (ids && ids.length) {
        partial = Xn.partial(parts.concat('record')).set_format(format);
        if (rel_limit) {
          partial.set_rel_limit(rel_limit);
        }
        return partial.search(ids).all();
      } else {
        return kew.resolve([]);
      }
    };

    ReportPage.prototype.error = function(err) {
      return RootWorkflow.error.call(this, err);
    };

    ReportPage.prototype.report_data_loaded = function() {
      this._report_data_loaded = true;
      return this.render();
    };

    ReportPage.prototype.dust_base = function() {
      return ReportPage.TemplateHelpers.make();
    };

    ReportPage.prototype.child_dust_base = function(record) {
      return this.attr('dust_base').push({
        instance: record.toJSON(2)
      });
    };

    ReportPage.prototype.dust_context = function() {
      var ctx;
      ctx = this.attr('dust_base').push({
        report_name: this.report_title(),
        paper_size: this.paper_size,
        user: Xn.user.toJSON(),
        today: new Date()
      });
      if (this._report_data_loaded) {
        return ctx.push({
          instance: this.attr('instance').toJSON(4)
        });
      } else {
        return ctx;
      }
    };

    ReportPage.prototype.report_title = function() {
      return dust.filters.humanize(this.attr('report_name'));
    };

    ReportPage.prototype.container_template = function() {
      return 'report/report_base';
    };

    ReportPage.prototype.report_template = function() {
      return "report/is/" + (this.attr('part')) + "/" + (this.attr('report_name'));
    };

    ReportPage.prototype._render = function() {
      var ctx;
      ctx = this.dust_context();
      this.render_base(ctx);
      if (this._report_data_loaded) {
        return this.render_report(ctx);
      }
    };

    ReportPage.prototype.render_base = function(ctx) {
      var _this = this;
      return dust.render(this.container_template(), ctx, function(err, html) {
        if (err) {
          return _this.trigger('error', err, _this);
        }
        _this.html(html);
        _this.print_btn.button('loading');
        _this.paper_sizes.removeClass('active').filter("[value=" + _this.paper_size + "]").addClass('active');
        return _this.report.addClass("report-" + (_this.attr('report_name')));
      });
    };

    ReportPage.prototype.render_report = function(ctx) {
      var _this = this;
      if (this._report_data_loaded) {
        dust.render(this.report_template(), ctx, function(err, html) {
          if (err) {
            return _this.trigger('error', err, _this);
          }
          _this.report.html(html);
          return _this.refreshElements();
        });
        this.render_model_pages();
        this.render_table_of_contents();
        this.print_btn.button('reset');
        return _.defer(function() {
          return _this.report.addClass('hidden-screen');
        });
      }
    };

    ReportPage.prototype.render_model_pages = function() {
      var container, controller, record;
      if (this.model_controllers) {
        _.invoke(this.model_controllers, 'release');
      }
      return this.model_controllers = (function() {
        var _i, _len, _ref, _results;
        _ref = this.model_containers;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          container = _ref[_i];
          container = $(container);
          record = Xn.instantiate(container.data('instance-id'));
          controller = new Model().attr('dust_base', this.child_dust_base(record)).instance(record);
          controller.appendTo(container);
          _results.push(controller);
        }
        return _results;
      }).call(this);
    };

    ReportPage.prototype.render_table_of_contents = function() {
      if (this.toc) {
        this.toc.release();
      }
      this.toc = new TableOfContents(this.attr('toc_options')).render();
      return this.toc.appendTo(this.toc_container);
    };

    ReportPage.prototype.release_controllers = function() {
      var ctrl, _i, _len, _ref, _results;
      if (this.toc) {
        this.toc.release();
      }
      if (this.model_controllers) {
        _ref = this.model_controllers;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          ctrl = _ref[_i];
          _results.push(ctrl.release());
        }
        return _results;
      }
    };

    ReportPage.TemplateHelpers = (function(_super1) {

      __extends(TemplateHelpers, _super1);

      function TemplateHelpers() {
        this.table = __bind(this.table, this);

        this.relationship = __bind(this.relationship, this);
        return TemplateHelpers.__super__.constructor.apply(this, arguments);
      }

      TemplateHelpers.prototype.part_name = function() {};

      TemplateHelpers.prototype.part_data = function(c, ctx, blocks, options) {
        return c.write('<dl class=dl-horizontal>').render(blocks.block, ctx).write('</dl>');
      };

      TemplateHelpers.prototype.property = function(c, ctx, blocks, options) {
        var value, _ref;
        if (options != null ? options.name : void 0) {
          value = ((_ref = ctx.get('instance')) != null ? _ref[options.name] : void 0) || ctx.get(options.name);
          if (options.filter && value) {
            value = dust.filters[options.filter](value);
          }
          if (options.href) {
            value = "<a href=\"" + options.href + "\">" + value + "</a>";
          }
          return c.write("          <dt>" + options.label + "</dt>          <dd>" + (value || '&nbsp;') + "</dd>");
        } else {
          return c;
        }
      };

      TemplateHelpers.prototype.relationship = function(c, ctx, blocks, options) {
        var name, rel, url, value, _i, _len, _ref, _results;
        if (options != null ? options.name : void 0) {
          if (this.filtered_relationships && this.filtered_relationships[options.name]) {
            return c;
          }
          value = ((_ref = ctx.get('instance')) != null ? _ref.rel[options.name] : void 0) || ctx.get(options.name);
          value = !_.isArray(value) ? [value] : _.isEmpty(value) ? [''] : value;
          c.write("<dt>" + options.label + "</dt>");
          _results = [];
          for (_i = 0, _len = value.length; _i < _len; _i++) {
            rel = value[_i];
            c.write('<dd>');
            c.write(rel ? (name = rel.display_name, url = ctx.get('base_url') + rel.meta.xnid, "<a href=\"" + url + "\">" + (name || '(unnamed)') + "</a>") : '&nbsp;');
            _results.push(c.write('</dd>'));
          }
          return _results;
        } else {
          return c;
        }
      };

      TemplateHelpers.prototype.table = function(c, ctx, blocks, options) {
        return this.relationship(c, ctx, blocks, options);
      };

      return TemplateHelpers;

    })(TemplateHelpers);

    return ReportPage;

  }).call(this, BaseController);

}).call(this);
}, "fe/controllers/result": function(exports, require, module) {(function() {
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  window.Result = (function(_super) {

    __extends(Result, _super);

    Result.prototype.size = 'inline';

    function Result(options) {
      var _ref;
      if (options == null) {
        options = {};
      }
      this._click_part = __bind(this._click_part, this);

      this._click_xnid = __bind(this._click_xnid, this);

      this.show = __bind(this.show, this);

      this.deselect = __bind(this.deselect, this);

      this.select = __bind(this.select, this);

      this.toggle_select = __bind(this.toggle_select, this);

      Result.__super__.constructor.apply(this, arguments);
      if (!this.container) {
        throw new Error('Result controller must have a container');
      }
      if (!this.instance) {
        throw new Error('Result controller must have a record instance');
      }
      if ((_ref = this.template) == null) {
        this.template = this.container.template || 'r/default';
      }
      this.render();
      if (options.selected) {
        this.select(false);
      }
    }

    Result.prototype.events = {
      'click .r-handle': 'toggle_select',
      'click .r-name > a': '_click_xnid',
      'click [data-part]': '_click_part'
    };

    Result.prototype.elements = {
      '.r': 'children'
    };

    Result.prototype.xnid = function() {
      return this.instance.xnid();
    };

    Result.prototype.id = function() {
      return this.instance.id();
    };

    Result.prototype.context = function() {
      var context, opts;
      if (this.container.context) {
        context = this.container.context();
      } else {
        context = TemplateHelpers.make();
      }
      if ((this.show_model != null) || (this.show_details != null) || (this.nested_details != null) || (this.handle != null)) {
        opts = {};
        opts.r_has_meta = this.show_model;
        if (this.show_model != null) {
          opts.r_show_model = this.show_model;
        }
        if (this.show_details != null) {
          opts.r_has_details = this.show_details;
        }
        if (this.nested_details != null) {
          opts.r_nested = !this.nested_details;
        }
        if (this.handle != null) {
          opts.r_handle = this.r_handle();
        }
        return context.push(opts);
      } else {
        return context;
      }
    };

    Result.prototype.r_handle = function() {
      if (!this.handle) {
        return 'no-';
      }
    };

    Result.prototype.toggle_select = function(event) {
      if (event) {
        event.stopPropagation();
      }
      if (event) {
        event.preventDefault();
      }
      if (this.selected) {
        return this.deselect();
      } else {
        return this.select();
      }
    };

    Result.prototype.select = function(event) {
      if (event == null) {
        event = true;
      }
      this.selected = true;
      this.el.addClass('selected');
      if (event) {
        return this.trigger('select', this.instance);
      }
    };

    Result.prototype.deselect = function(event) {
      if (event == null) {
        event = true;
      }
      this.selected = false;
      this.el.removeClass('selected');
      if (event) {
        return this.trigger('deselect', this.instance);
      }
    };

    Result.prototype.render = function() {
      var _this = this;
      return this.instance.render(this.context(), this.template, function(err, html) {
        _this.replace($(html));
        if (_this.size) {
          _this.el.addClass(_this.size);
        }
        if (_this.selected) {
          _this.el.addClass('selected');
        }
        if (_this.color) {
          _this.el.addClass(_this.color);
        }
        _this.el.data('xnid', _this.xnid());
        _this._width = void 0;
        return _this.trigger('render', _this);
      });
    };

    Result.prototype.width = function(arg) {
      if (this._width == null) {
        if (this.width_set) {
          this.el.width('auto');
        }
        this._width = this.el.width();
      }
      if (arg != null) {
        this.width_set = true;
        return this.el.width(arg);
      } else {
        return this._width;
      }
    };

    Result.prototype.height = function(arg) {
      return this.el.height(arg);
    };

    Result.prototype.set_size = function(size) {
      this.el.removeClass(this.size).addClass(size);
      this.size = size;
      this._width = void 0;
      return this.trigger('render', this);
    };

    Result.prototype.show = function() {
      return main.navigate(this.xnid());
    };

    Result.prototype._click_xnid = function(event) {
      var el;
      if (event.metaKey || event.shiftKey || (this.default_click && this.navigate)) {
        return;
      }
      event.preventDefault();
      if (this.navigate === false) {
        return;
      }
      el = $(event.currentTarget).parents('[data-xnid]')[0];
      return main.navigate(el.dataset.xnid);
    };

    Result.prototype._click_part = function(event) {
      var part, parts, template, type,
        _this = this;
      event.preventDefault();
      part = event.currentTarget.dataset.part;
      template = "r/is/" + part;
      if (dust.cache[template]) {
        type = this.instance.type();
        parts = type.parts();
        if (type.parts().indexOf(part) >= 0) {
          this.template = template;
          return this.render();
        } else {
          return Xn.xnid(this.instance.xnid(), function(err, inst) {
            if (err) {
              return;
            }
            _this.template = template;
            _this.instance = inst;
            return _this.render();
          });
        }
      }
    };

    return Result;

  })(Spine.Controller);

}).call(this);
}, "fe/controllers/search": function(exports, require, module) {(function() {
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  window.Search = (function(_super) {

    __extends(Search, _super);

    Search.prototype.className = 'search-page box-layout horizontal';

    Search.prototype.elements = {
      '.panel-container': 'el_panel_container'
    };

    function Search() {
      this._release_panels = __bind(this._release_panels, this);

      this._on_error = __bind(this._on_error, this);

      this._on_activate = __bind(this._on_activate, this);

      this._on_selection = __bind(this._on_selection, this);

      this._on_panel_scroll = __bind(this._on_panel_scroll, this);

      this.close_after = __bind(this.close_after, this);

      this.close = __bind(this.close, this);

      this.navigate = __bind(this.navigate, this);
      Search.__super__.constructor.apply(this, arguments);
      this.panels = [];
      this.has_action_bar = this.options.action_bar != null ? this.options.action_bar : true;
      this._render();
      this.release(this._release_panels);
    }

    Search.prototype.add_panel = function(options) {
      var action_bar, panel, panel_opts;
      if (((options != null ? options.action_bar : void 0) != null) || this.has_action_bar) {
        action_bar = new ActionBar;
      }
      panel_opts = {
        action_bar: action_bar,
        name: this.options.name
      };
      if (options) {
        $.extend(panel_opts, options);
      }
      panel = new SearchPanel(panel_opts);
      panel.appendTo(this.el_panel_container);
      if (action_bar) {
        action_bar.appendTo(this.el_panel_container);
      }
      this.panels.push(panel);
      panel.bind('navigate', this.navigate);
      panel.bind('close', this.close);
      panel.bind('selection', this._on_selection);
      panel.bind('close_after', this.close_after);
      panel.bind('activate', this._on_activate);
      panel.bind('error', this._on_error);
      this.scroll_to_right();
      return panel;
    };

    Search.prototype.scroll_to_right = function() {
      var dom_el;
      dom_el = this.el_panel_container[0];
      return this.el_panel_container.animate({
        scrollLeft: dom_el.scrollWidth - dom_el.clientWidth
      }, 300);
    };

    Search.prototype.show_sidebar = function() {
      if (!this.filter_bar) {
        this._render_sidebar();
      }
      if (this.sidebar.panel !== this.active_panel) {
        this.sidebar.set_active_panel(this.active_panel);
      }
      return this.sidebar.el.css('display', 'table-cell');
    };

    Search.prototype.hide_sidebar = function() {
      if (this.sidebar) {
        return this.sidebar.el.hide();
      }
    };

    Search.prototype._render = function() {
      var panel;
      if (this.options.sidebar !== false) {
        this._render_sidebar();
      }
      this._render_panel_container();
      if (this.options && (this.options.is || this.options.based_on)) {
        panel = this.add_panel($.extend({
          is: this.options.is,
          based_on: this.options.based_on
        }, this.options.panel));
        return panel.activate();
      }
    };

    Search.prototype._render_sidebar = function() {
      this.filter_bar = new FilterBar({
        hide_creation_options: !!this.options.hide_creation_options
      });
      this.filter_bar.append_to(this);
      return this.filter_bar.bind('error', this._on_error);
    };

    Search.prototype._render_panel_container = function() {
      var _this = this;
      dust.render('search/panel_container', this.attr('dust_base'), function(err, html) {
        return _this.append(html);
      });
      return this.el_panel_container.on('scroll', this._on_panel_scroll);
    };

    Search.prototype.navigate = function(options) {
      if (options.panel) {
        this.close_after(options.panel);
      }
      return this.add_panel(options);
    };

    Search.prototype.close = function(panel) {
      var idx, p, _i, _len, _ref, _ref1, _results;
      idx = this.panels.indexOf(panel);
      if (idx >= 0) {
        _ref = this.panels.splice(idx);
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          p = _ref[_i];
          p.release();
          if (this.filter_bar && this.filter_bar.panel === p) {
            _results.push((_ref1 = this.panels[idx - 1]) != null ? _ref1.activate() : void 0);
          } else {
            _results.push(void 0);
          }
        }
        return _results;
      }
    };

    Search.prototype.close_after = function(panel) {
      var idx;
      idx = this.panels.indexOf(panel);
      if (idx >= 0 && this.panels[idx + 1]) {
        return this.close(this.panels[idx + 1]);
      }
    };

    Search.prototype._on_panel_scroll = function(e) {
      if (this.el_panel_container.scrollLeft() !== 0) {
        if (!this.el.hasClass('scroll-x')) {
          return this.el.addClass('scroll-x');
        }
      } else {
        return this.el.removeClass('scroll-x');
      }
    };

    Search.prototype._on_selection = function(panel, ids) {
      var next;
      this.trigger('selection', panel, ids);
      next = this.panels[this.panels.indexOf(panel) + 1];
      if (next) {
        return next.set_source_ids(ids);
      }
    };

    Search.prototype._on_activate = function(panel) {
      var _ref;
      if ((_ref = this.active_panel) != null) {
        _ref.deactivate();
      }
      if (this.filter_bar) {
        this.filter_bar.set_active_panel(panel);
      }
      return this.active_panel = panel;
    };

    Search.prototype._on_error = function(err) {
      return console.log('got error', err, 'probably should capture more info in events');
    };

    Search.prototype._release_panels = function() {
      var panel, _i, _len, _ref, _ref1, _results;
      if ((_ref = this.filter_bar) != null) {
        _ref.release();
      }
      _ref1 = this.panels;
      _results = [];
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        panel = _ref1[_i];
        _results.push(panel.release());
      }
      return _results;
    };

    return Search;

  })(BaseController);

  window.SearchPage = (function(_super) {

    __extends(SearchPage, _super);

    SearchPage.include(RootWorkflow);

    function SearchPage() {
      SearchPage.__super__.constructor.apply(this, arguments);
      this.title('Search - LightMesh CMDB');
    }

    return SearchPage;

  })(Search);

}).call(this);
}, "fe/controllers/search_panel": function(exports, require, module) {(function() {
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  window.SearchPanel = (function(_super) {

    __extends(SearchPanel, _super);

    SearchPanel.prototype.className = 'search-panel inactive';

    SearchPanel.prototype.elements = {
      '> .search-results': 'el_results',
      '> .search-panel-header > .search-status': 'el_status',
      '> .search-panel-header > .search-summary': 'el_summary'
    };

    SearchPanel.prototype.events = {
      'click': 'activate'
    };

    SearchPanel.prototype.template = 'search/panel';

    SearchPanel.prototype.auto_update = true;

    SearchPanel.prototype.unique = true;

    SearchPanel.prototype.active_size = 'medium';

    SearchPanel.prototype.inactive_size = 'compact';

    function SearchPanel() {
      this._release = __bind(this._release, this);

      this._on_close_ab = __bind(this._on_close_ab, this);

      this._on_deselect_ab = __bind(this._on_deselect_ab, this);

      this._on_select_ab = __bind(this._on_select_ab, this);

      this._on_deselect_result = __bind(this._on_deselect_result, this);

      this._on_select_result = __bind(this._on_select_result, this);

      this._on_select_all_ab = __bind(this._on_select_all_ab, this);

      this._on_select_none_ab = __bind(this._on_select_none_ab, this);

      this._on_get_count_ab = __bind(this._on_get_count_ab, this);

      this._on_error = __bind(this._on_error, this);

      this._on_loading = __bind(this._on_loading, this);

      this._on_empty_page = __bind(this._on_empty_page, this);

      this._on_loaded = __bind(this._on_loaded, this);

      this._on_offset = __bind(this._on_offset, this);

      this._on_to = __bind(this._on_to, this);

      this._on_rel = __bind(this._on_rel, this);

      this._clear_status = __bind(this._clear_status, this);

      this._render_resource = __bind(this._render_resource, this);

      this._render_after_callback = __bind(this._render_after_callback, this);

      this.activate = __bind(this.activate, this);

      this.set_selected = __bind(this.set_selected, this);

      this.add_instances = __bind(this.add_instances, this);

      this.deselect = __bind(this.deselect, this);

      this.select = __bind(this.select, this);

      var _ref, _ref1;
      SearchPanel.__super__.constructor.apply(this, arguments);
      this.active = false;
      if ((_ref = this.limit) == null) {
        this.limit = 100;
      }
      if ((_ref1 = this.offset) == null) {
        this.offset = 0;
      }
      this._render_layout();
      this.set_base(this.options.based_on, this.options.is);
      this.filter_parts = [];
      this.filters = {};
      if (this.auto_update) {
        this.update();
      }
      this.release(this._release);
    }

    SearchPanel.prototype.metadata = function(callback) {
      return this.resource(true).metadata(callback);
    };

    SearchPanel.prototype.selected_ids = function() {
      return this.search_results.selected_ids();
    };

    SearchPanel.prototype.all_ids = function() {
      return this.search_results.all_ids();
    };

    SearchPanel.prototype.selected = function() {
      return this.search_results.selected();
    };

    SearchPanel.prototype.instances = function() {
      return this.search_results.sorted_instances || this.search_results.instances() || [];
    };

    SearchPanel.prototype.results = function() {
      return this.search_results.results || [];
    };

    SearchPanel.prototype.select = function(instance, event) {
      if (event == null) {
        event = true;
      }
      return this.search_results.select(instance, event);
    };

    SearchPanel.prototype.deselect = function(instance, event) {
      if (event == null) {
        event = true;
      }
      return this.search_results.deselect(instance, event);
    };

    SearchPanel.prototype.add_instances = function(insts) {
      this.search_results.add_instances(insts);
      return this;
    };

    SearchPanel.prototype.set_selected = function(insts, event) {
      if (event == null) {
        event = true;
      }
      this.search_results.set_selected(insts, event);
      return this;
    };

    SearchPanel.prototype.activate = function() {
      if (this.active) {
        return;
      }
      this.active = true;
      this.el.addClass('active').removeClass('inactive');
      this.search_results.set_size(this.active_size);
      return this.trigger('activate', this);
    };

    SearchPanel.prototype.deactivate = function() {
      if (!this.active) {
        return;
      }
      this.active = false;
      this.el.addClass('inactive').removeClass('active');
      return this.search_results.set_size(this.inactive_size);
    };

    SearchPanel.prototype.set_base = function(based_on, parts) {
      var _ref, _ref1,
        _this = this;
      this.based_on = based_on;
      this.parts = parts;
      this.base_resource = this.based_on;
      if ((_ref = this.parts) != null ? _ref.length : void 0) {
        if ((_ref1 = this.action_bar) != null) {
          _ref1.set_base_parts(this.parts);
        }
        this.base_resource = (this.based_on || Xn).is(this.parts);
      } else if (this.based_on) {
        if (this.based_on.rel_type) {
          this.base_resource.metadata(function() {
            return _this.base_resource.type().parts(function(e, parts) {
              var _ref2;
              return (_ref2 = _this.action_bar) != null ? _ref2.set_base_parts(parts) : void 0;
            });
          });
        } else {
          this.base_resource.parts(function(e, parts) {
            var _ref2;
            return (_ref2 = _this.action_bar) != null ? _ref2.set_base_parts(parts) : void 0;
          });
        }
        this.base_resource = this.based_on;
      } else {
        throw new Error('No base or resource specified');
      }
      return this._update_template();
    };

    SearchPanel.prototype.set_source_ids = function(ids) {
      if (this.ids_resource) {
        this.ids_resource.set_ids(ids);
        this.update();
        return this.trigger('selection', this, this.selected_ids());
      }
    };

    SearchPanel.prototype.add_part = function(part) {
      var idx;
      idx = this.filter_parts.indexOf(part);
      if (idx === -1) {
        return this.filter_parts.push(part);
      }
    };

    SearchPanel.prototype.remove_part = function(part) {
      var idx;
      idx = this.filter_parts.indexOf(part);
      if (idx >= 0) {
        return this.filter_parts.splice(idx, 1);
      }
    };

    SearchPanel.prototype.set_filter = function(name, args) {
      return this.filters[name] = args;
    };

    SearchPanel.prototype.remove_filter = function(name) {
      return delete this.filters[name];
    };

    SearchPanel.prototype.resource = function(unique, rendering) {
      var args, name, parts, r, _ref, _ref1;
      if (unique == null) {
        unique = void 0;
      }
      if (rendering == null) {
        rendering = false;
      }
      if (unique == null) {
        unique = this.unique;
      }
      r = this.base_resource;
      this._defer_render = 0;
      if ((_ref = this.filter_parts) != null ? _ref.length : void 0) {
        parts = _.unique(this.parts.concat(this.filter_parts));
        if (this.base_resource === this.base_resource.type()) {
          r = Xn.is(parts);
        } else {
          r = r.is(parts);
        }
      }
      if (unique) {
        r = r.unique();
      }
      if (rendering) {
        r.limit = this.limit;
        r.offset = this.offset;
      }
      if (!$.isEmptyObject(this.filters)) {
        r = r.search();
        _ref1 = this.filters;
        for (name in _ref1) {
          args = _ref1[name];
          if (rendering) {
            r.set_filter(name, args, this._render_after_callback());
          } else {
            r.set_filter(name, args);
          }
        }
      }
      return r;
    };

    SearchPanel.prototype.update = function(keep_sel) {
      return this._render_resource(this.resource(true, true), keep_sel);
    };

    SearchPanel.prototype.clear = function() {
      var _ref;
      return (_ref = this.search_results) != null ? _ref.clear() : void 0;
    };

    SearchPanel.prototype._render_after_callback = function() {
      this._defer_render++;
      return this._render_resource;
    };

    SearchPanel.prototype._render_resource = function(r, keep_sel) {
      if (r) {
        this._resource_to_render = r;
      }
      if (this._defer_render === 0) {
        return this.search_results.render_resource(this._resource_to_render, null, keep_sel);
      } else {
        return this._defer_render--;
      }
    };

    SearchPanel.prototype.context = function() {
      var _ref;
      return (_ref = this._context) != null ? _ref : this._context = TemplateHelpers.make().push({
        name: this.name
      });
    };

    SearchPanel.prototype._render_layout = function() {
      var _this = this;
      if (this.template) {
        return dust.render(this.template, this.context(), function(err, html) {
          _this.html(html);
          return _this._render_components();
        });
      } else {
        return this._render_components();
      }
    };

    SearchPanel.prototype._render_components = function() {
      var options;
      options = {};
      if (this.el_results.length === 0) {
        options.el = this.el;
      } else {
        options.el = this.el_results[0];
      }
      if (this.options.show_details != null) {
        options.show_details = this.options.show_details;
      }
      if (this.options.show_model != null) {
        options.show_model = this.options.show_model;
      }
      if (this.options.show_id != null) {
        options.show_id = this.options.show_id;
      }
      if (this.options.select_all != null) {
        options.select_all = this.options.select_all;
      }
      if (this.options.offset != null) {
        options.offset = this.options.offset;
      }
      if (this.options.limit != null) {
        options.limit = this.options.limit;
      }
      if (this.options.handle != null) {
        options.handle = this.options.handle;
      }
      if (this.options.navigate != null) {
        options.navigate = this.options.navigate;
      }
      if (this.options.select_one != null) {
        options.select_one = this.options.select_one;
      }
      if (this.options.max_width != null) {
        options.max_width = this.options.max_width;
      }
      if (this.options.min_width != null) {
        options.min_width = this.options.min_width;
      }
      options.no_results_template = 'search/no_results';
      options.preserve_data = this.include_invisible;
      options.default_click = true;
      this.search_results = new SearchResults(options);
      return this._bind();
    };

    SearchPanel.prototype._update_template = function() {
      var part,
        _this = this;
      if (this.base_resource.constructor === xn.meta.Model) {
        if (this.search_results.set_template("r/model/" + (this.base_resource.name()))) {
          return;
        }
      }
      if (this.parts) {
        part = this.parts[this.parts.length - 1];
        return this.search_results.set_template("r/is/" + part);
      } else {
        return this.base_resource.type().parts(function(err, parts) {
          _this.parts = parts;
          return _this._update_template();
        });
      }
    };

    SearchPanel.prototype._clear_status = function() {
      if (this.el_status) {
        return this.el_status.html('');
      }
    };

    SearchPanel.prototype._bind = function() {
      var _this = this;
      this.search_results.bind('select', this._on_select_result);
      this.search_results.bind('deselect', this._on_deselect_result);
      this.search_results.bind('loading', this._on_loading);
      this.search_results.bind('loaded', this._on_loaded);
      this.search_results.bind('empty_page', this._on_empty_page);
      this.search_results.bind('error', this._on_error);
      this.search_results.bind('clear', this._clear_status);
      if (this.action_bar) {
        this.action_bar.offset = this.offset;
        this.action_bar.limit = this.limit;
        this.action_bar.bind('select', this._on_select_ab);
        this.action_bar.bind('deselect', this._on_deselect_ab);
        this.action_bar.bind('select_all', this._on_select_all_ab);
        this.action_bar.bind('select_none', this._on_select_none_ab);
        this.action_bar.bind('get_count', this._on_get_count_ab);
        this.action_bar.bind('rel', this._on_rel);
        this.action_bar.bind('to', this._on_to);
        this.action_bar.bind('close', this._on_close_ab);
        this.action_bar.bind('offset', this._on_offset);
        return this.action_bar.attr('resource', function() {
          var res;
          res = null;
          _this.selected_resource(null, function(resource) {
            return res = resource;
          });
          return res;
        });
      }
    };

    SearchPanel.prototype.selected_resource = function(part, callback) {
      var resource,
        _this = this;
      resource = this.resource(false);
      return resource != null ? resource.parts(function(err, parts) {
        if (err) {
          return _this.trigger('error', err);
        } else {
          if (part && !parts.some(function(p) {
            return part === p;
          })) {
            resource = resource.is([part]);
          }
          return callback(resource.search(_this.selected_ids()));
        }
      }) : void 0;
    };

    SearchPanel.prototype.navigate = function(el, part, callback) {
      var _this = this;
      return this.selected_resource(part, function(ids_resource) {
        return ids_resource.metadata(function(err, md) {
          var resource;
          resource = callback(ids_resource);
          return _this.trigger('navigate', {
            panel: _this,
            name: el.text(),
            ids_resource: ids_resource,
            based_on: resource
          });
        });
      });
    };

    SearchPanel.prototype._on_rel = function(rel, el) {
      return this.navigate(el, rel.part(), function(r) {
        return r.rel(rel.name);
      });
    };

    SearchPanel.prototype._on_to = function(to, el) {
      return this.navigate(el, to.part(), function(r) {
        return r.to(to.name, to["arguments"]);
      });
    };

    SearchPanel.prototype._on_offset = function(offset) {
      this.offset = offset;
      if (this.offset < 0) {
        this.offset = 0;
      }
      return this.update(true);
    };

    SearchPanel.prototype._on_loaded = function(instances) {
      var _ref,
        _this = this;
      if ((_ref = this.action_bar) != null) {
        _ref.set_result_count(instances.length);
      }
      if (this.el_summary) {
        return dust.render('search/status/summary', this.context(), function(err, html) {
          if (err) {
            throw err;
          }
          return _this.el_summary.html(html);
        });
      }
    };

    SearchPanel.prototype._on_empty_page = function() {
      var _ref;
      this.offset -= this.limit;
      return (_ref = this.action_bar) != null ? _ref.empty_page() : void 0;
    };

    SearchPanel.prototype._on_loading = function() {
      var _this = this;
      if (this.el_status) {
        return dust.render('search/status/loading', this.context(), function(err, html) {
          if (err) {
            throw err;
          }
          return _this.el_status.append(html);
        });
      }
    };

    SearchPanel.prototype._on_error = function(err) {
      var context,
        _this = this;
      if (this.el_status) {
        context = this.context().push({
          message: (err != null ? err.message : void 0) || err
        });
        return dust.render('search/status/error', context, function(err, html) {
          if (err) {
            throw err;
          }
          return _this.el_status.append(html);
        });
      }
    };

    SearchPanel.prototype._on_get_count_ab = function() {
      var _this = this;
      return this.resource(true, false).count(function(e, count) {
        return _this.action_bar.set_total_count(count);
      });
    };

    SearchPanel.prototype._on_select_none_ab = function() {
      this.action_bar.select_none();
      this.set_selected([], false);
      return this.trigger('selection', this, []);
    };

    SearchPanel.prototype._on_select_all_ab = function() {
      var insts;
      insts = this.instances();
      this.action_bar.select_all(insts);
      this.set_selected(insts, false);
      return this.trigger('selection', this, this.all_ids());
    };

    SearchPanel.prototype._on_select_result = function(instance) {
      var _ref;
      if ((_ref = this.action_bar) != null) {
        _ref.select(instance, false);
      }
      return this.trigger('selection', this, this.selected_ids());
    };

    SearchPanel.prototype._on_deselect_result = function(instance) {
      var _ref;
      if ((_ref = this.action_bar) != null) {
        _ref.deselect(instance, false);
      }
      return this.trigger('selection', this, this.selected_ids());
    };

    SearchPanel.prototype._on_select_ab = function(instance) {
      this.search_results.select(instance, false);
      return this.trigger('selection', this, this.selected_ids());
    };

    SearchPanel.prototype._on_deselect_ab = function(instance) {
      this.search_results.deselect(instance, false);
      return this.trigger('selection', this, this.selected_ids());
    };

    SearchPanel.prototype._on_close_ab = function() {
      return this.trigger('close_after', this);
    };

    SearchPanel.prototype._release = function() {
      var _ref, _ref1;
      if ((_ref = this.search_results) != null) {
        _ref.release();
      }
      return (_ref1 = this.action_bar) != null ? _ref1.release() : void 0;
    };

    return SearchPanel;

  })(Spine.Controller);

}).call(this);
}, "fe/controllers/search_results": function(exports, require, module) {(function() {
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    __slice = [].slice;

  window.SearchResults = (function(_super) {

    __extends(SearchResults, _super);

    function SearchResults() {
      this._click_close_alert = __bind(this._click_close_alert, this);

      this._click_size = __bind(this._click_size, this);

      this._on_deselect = __bind(this._on_deselect, this);

      this._on_select = __bind(this._on_select, this);

      this.__align_results = __bind(this.__align_results, this);

      this._render_instances = __bind(this._render_instances, this);
      SearchResults.__super__.constructor.apply(this, arguments);
      this._result_map = {};
      this._selected = {};
      this._instances = {};
      this.release(function() {
        return this._remove_results();
      });
      this.align_results = _.debounce(this.__align_results, 25);
    }

    SearchResults.prototype.events = {
      'click a[data-size]': '_click_size',
      'click .alert-message .close': '_click_close_alert'
    };

    SearchResults.prototype.render_resource = function(resource, callback, keep_sel) {
      var _ref;
      if ((_ref = this.resource) != null) {
        _ref.abort();
      }
      this.resource = resource;
      if (resource) {
        return this.reload(callback, keep_sel);
      }
    };

    SearchResults.prototype.render_instances = function(instances) {
      this.resource = void 0;
      return this._render_instances(void 0, instances);
    };

    SearchResults.prototype.reload = function(callback, keep_sel) {
      var _this = this;
      if (this.resource) {
        this.trigger('loading');
        if (this.offset != null) {
          this.resource.offset = this.offset;
        }
        if (this.limit != null) {
          this.resource.limit = this.limit;
        }
        this.resource.abort();
        return this.resource.all(function(err, i) {
          if (!err && i.length === 0 && _this.resource.offset > 0) {
            _this.trigger('clear');
            _this.trigger('empty_page');
            if (callback != null) {
              return callback(err, i);
            }
          } else {
            _this._render_instances(err, i, keep_sel);
            if (callback != null) {
              return callback(err, i);
            }
          }
        });
      }
    };

    SearchResults.prototype.render = function() {
      var result, _i, _len, _ref, _results;
      this._context = void 0;
      if (this.results) {
        _ref = this.results;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          result = _ref[_i];
          _results.push(result.render());
        }
        return _results;
      }
    };

    SearchResults.prototype.clear = function() {
      this.trigger('clear');
      this._remove_results();
      return this.trigger('loaded', []);
    };

    SearchResults.prototype.size = 'compact';

    SearchResults.prototype.show_details = true;

    SearchResults.prototype.show_model = true;

    SearchResults.prototype.show_id = true;

    SearchResults.prototype.handle = true;

    SearchResults.prototype.nested_details = false;

    SearchResults.prototype.sort_by = function(i) {
      return ('' + i.attr('display_name')).split(/(\d+)/).map(function(s) {
        var n;
        n = s * 1;
        if (n) {
          return n;
        } else {
          return s;
        }
      });
    };

    SearchResults.prototype.context = function() {
      var _ref;
      return (_ref = this._context) != null ? _ref : this._context = TemplateHelpers.make().push({
        r_has_meta: this.show_model,
        r_show_model: this.show_model,
        r_has_details: this.show_details,
        r_nested: !this.nested_details,
        r_handle: this.r_handle()
      });
    };

    SearchResults.prototype.r_handle = function() {
      if (!this.handle) {
        return 'no-';
      }
    };

    SearchResults.prototype.set_template = function() {
      var t, templates, _i, _len;
      templates = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      for (_i = 0, _len = templates.length; _i < _len; _i++) {
        t = templates[_i];
        if (dust.cache[t] != null) {
          this.template = t;
          return true;
        }
      }
      this.template = 'r/default';
      return false;
    };

    SearchResults.prototype.template = void 0;

    SearchResults.prototype._render_instances = function(err, instances, keep_sel) {
      var id, missing, new_results, r, selected, _ref,
        _this = this;
      this.trigger('clear');
      if (err) {
        return this.trigger('error', err);
      } else if (!instances) {
        throw new Error('No instances to render');
      } else {
        if (this.sort_by) {
          instances = _.sortBy(instances, this.sort_by);
          this.sorted_instances = instances;
        }
        new_results = {};
        if (this.preserve_data) {
          this.results = [];
          this._instances = {};
        } else {
          if (keep_sel) {
            selected = this.selected();
            this._instances = {};
            this.results = selected.map(function(inst, i) {
              var result;
              result = _this.append_instance(inst);
              new_results[inst.id()] = result;
              return result;
            });
          } else {
            this.results = [];
            this._instances = {};
          }
        }
        if (instances.length) {
          this._remove_no_results();
          this.results = this.results.concat(instances.map(function(inst, i) {
            var result;
            if (!_this._instances[inst.id()]) {
              if (!_this.limit || _this.limit > i) {
                result = _this.append_instance(inst);
                new_results[inst.id()] = result;
                return result;
              }
            }
          }));
          this.results = (function() {
            var _i, _len, _ref, _results;
            _ref = this.results;
            _results = [];
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
              r = _ref[_i];
              if (r) {
                _results.push(r);
              }
            }
            return _results;
          }).call(this);
          this.align_results();
        } else if (this.results.length === 0) {
          this.show_no_results();
        }
        _ref = this._result_map;
        for (id in _ref) {
          missing = _ref[id];
          if (missing.locked) {
            new_results[id] = missing;
          } else {
            missing.release();
          }
        }
        this.trigger('loaded', instances);
        return this._result_map = new_results;
      }
    };

    SearchResults.prototype.show_no_results = function() {
      if (this.options.no_results_template) {
        this._remove_no_results();
        this.no_results = new NoResults(this.options.no_results_template);
        this.no_results.render();
        this.append(this.no_results);
        return this.no_results;
      }
    };

    SearchResults.prototype._remove_no_results = function() {
      if (this.no_results) {
        this.no_results.release();
        return this.no_results = null;
      }
    };

    SearchResults.prototype.__align_results = function() {
      var result, widest, width, _i, _len, _ref, _results;
      if (this.results.length) {
        widest = _.max(this.results, function(r) {
          return r.width();
        });
        if (widest) {
          width = widest.width();
          if (this.max_width && width > this.max_width) {
            width = this.max_width;
          }
          if (this.min_width && width < this.min_width) {
            width = this.min_width;
          }
          _ref = this.results;
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            result = _ref[_i];
            _results.push(result.width(width));
          }
          return _results;
        }
      }
    };

    SearchResults.prototype.append_instance = function(inst) {
      var id, result;
      id = inst.id();
      result = this._result_map[id];
      this._instances[id] = inst;
      if (result) {
        delete this._result_map[id];
      } else {
        if (this.select_all) {
          this._selected[id] = true;
        }
        result = new Result({
          container: this,
          instance: inst,
          size: this.size,
          selected: this._selected[id],
          navigate: this.navigate,
          default_click: this.default_click
        });
        result.bind('select', this._on_select);
        result.bind('deselect', this._on_deselect);
        result.bind('render', this.align_results);
      }
      this.append(result);
      return result;
    };

    SearchResults.prototype._on_select = function(instance) {
      var s, _i, _len, _ref;
      if (this.select_one) {
        _ref = this.selected();
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          s = _ref[_i];
          if (s.id() !== instance.id()) {
            this.deselect(s);
          }
        }
      }
      this._selected[instance.id()] = true;
      return this.trigger('select', instance);
    };

    SearchResults.prototype._on_deselect = function(instance) {
      delete this._selected[instance.id()];
      return this.trigger('deselect', instance);
    };

    SearchResults.prototype.instances = function() {
      return _.values(this._instances);
    };

    SearchResults.prototype.selected_results = function() {
      var id, sel, _ref, _results;
      _ref = this._selected;
      _results = [];
      for (id in _ref) {
        sel = _ref[id];
        if (sel) {
          _results.push(this._result_map[id]);
        }
      }
      return _results;
    };

    SearchResults.prototype.result = function(id) {
      return this._result_map[id];
    };

    SearchResults.prototype.selected = function() {
      var id, sel, _ref, _results;
      _ref = this._selected;
      _results = [];
      for (id in _ref) {
        sel = _ref[id];
        if (sel) {
          _results.push(this._instances[id]);
        }
      }
      return _results;
    };

    SearchResults.prototype.selected_ids = function() {
      var id, sel, _ref, _results;
      _ref = this._selected;
      _results = [];
      for (id in _ref) {
        sel = _ref[id];
        if (sel) {
          _results.push(id);
        }
      }
      return _results;
    };

    SearchResults.prototype.selected_instances = function() {
      var id, result, sel, _ref;
      result = {};
      _ref = this._selected;
      for (id in _ref) {
        sel = _ref[id];
        if (sel) {
          result[id] = this._instances[id];
        }
      }
      return result;
    };

    SearchResults.prototype.all_ids = function() {
      return _.keys(this._instances).map(function(k) {
        return Number(k) || k;
      });
    };

    SearchResults.prototype._array_wrap = function(x) {
      if (_.isArray(x)) {
        return x;
      } else if (x) {
        return [x];
      } else {
        return [];
      }
    };

    SearchResults.prototype.add_instances = function(insts) {
      var inst, result, _i, _len, _ref;
      _ref = this._array_wrap(insts);
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        inst = _ref[_i];
        result = this.result(inst.id());
        if (!result) {
          result = this.append_instance(inst);
          result.locked = true;
          this._result_map[result.id()] = result;
        }
      }
      return this;
    };

    SearchResults.prototype.set_selected = function(insts, event) {
      var diff, id, inst, result, _i, _j, _len, _len1;
      if (event == null) {
        event = true;
      }
      insts = this._array_wrap(insts);
      diff = _.difference(this.selected_ids(), insts.map(function(inst) {
        return inst.id();
      }));
      this._selected = {};
      for (_i = 0, _len = diff.length; _i < _len; _i++) {
        id = diff[_i];
        result = this.result(id);
        this._selected[id] = false;
        if (result) {
          result.deselect(event);
        }
      }
      for (_j = 0, _len1 = insts.length; _j < _len1; _j++) {
        inst = insts[_j];
        result = this.result(inst.id());
        this._selected[inst.id()] = true;
        if (result) {
          result.select(event);
        }
      }
      return this;
    };

    SearchResults.prototype.select = function(instance, event) {
      var result;
      if (event == null) {
        event = true;
      }
      result = this._result_map[instance.id()];
      if (result) {
        this._selected[instance.id()] = true;
        result.select(event);
      }
      return void 0;
    };

    SearchResults.prototype.deselect = function(instance, event) {
      var result;
      if (event == null) {
        event = true;
      }
      result = this._result_map[instance.id()];
      if (result) {
        delete this._selected[instance.id()];
        result.deselect(event);
      }
      return void 0;
    };

    SearchResults.prototype.set_size = function(size) {
      var result, _i, _len, _ref;
      this.size = size;
      if (this.results) {
        _ref = this.results;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          result = _ref[_i];
          result.set_size(this.size);
        }
      }
      return void 0;
    };

    SearchResults.prototype._remove_results = function() {
      var result, _i, _len, _ref;
      this.remove_no_results;
      if (this.results) {
        this._selected = {};
        this._result_map = {};
        _ref = this.results;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          result = _ref[_i];
          result.release();
        }
        this.results = [];
      }
      return void 0;
    };

    SearchResults.prototype._click_size = function(event) {
      var target;
      event.cancelDefault();
      target = $(event.currentTarget);
      return this.set_size(target.data('size'));
    };

    SearchResults.prototype._click_close_alert = function(event) {
      var target;
      event.cancelDefault();
      target = $(event.currentTarget).parents('.alert-message');
      return target.remove();
    };

    return SearchResults;

  })(Spine.Controller);

}).call(this);
}, "fe/controllers/visualize": function(exports, require, module) {(function() {
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  window.Visualize = (function(_super) {

    __extends(Visualize, _super);

    Visualize.prototype.className = 'visualize';

    Visualize.include(WorkflowSimpleEvents);

    function Visualize() {
      this.handle_failure = __bind(this.handle_failure, this);

      this.check_empty = __bind(this.check_empty, this);

      this.render = __bind(this.render, this);

      var _this = this;
      Visualize.__super__.constructor.apply(this, arguments);
      this.on_change('instance', function() {
        return _this._show = null;
      });
      this.on_change('instance', this.render);
    }

    Visualize.prototype.visualization = function(f) {
      this.vis_fn = f;
      this.render();
      return this;
    };

    Visualize.prototype.tree = function(f) {
      this.mk_tree = f;
      this.render();
      return this;
    };

    Visualize.prototype.render_into = function() {
      return this.el[0];
    };

    Visualize.prototype.show = function() {
      var _this = this;
      if (this._show) {
        return this._show;
      } else if (this.vis_fn) {
        $(this.render_into()).html('');
        return this._show = this.vis_fn(this.render_into(), function(e, d) {
          return _this.event(e, d);
        });
      }
    };

    Visualize.prototype.render = function() {
      if (this.mk_tree && this.vis_fn && this.attr('instance')) {
        return this.mk_tree(this.attr('instance')).then(this.check_empty).fail(this.handle_failure).then(this.show());
      }
    };

    Visualize.prototype.check_empty = function(tree) {
      if (tree.children) {
        return tree;
      } else {
        throw new Error("No child elements");
      }
    };

    Visualize.prototype.handle_failure = function(e) {
      return main.error(e);
    };

    return Visualize;

  })(BaseController);

  Workflow.visualize = (function(_super) {

    __extends(visualize, _super);

    visualize.prototype.elements = {
      '.dv-value': 'el_value',
      '.dv-edit': 'el_edit'
    };

    function visualize() {
      this.handle_failure = __bind(this.handle_failure, this);

      var config, view, width;
      visualize.__super__.constructor.apply(this, arguments);
      config = this.el[0].dataset;
      view = Visualization[config.view];
      width = config.width || _.max([$(document).width() - 500, 200]);
      if (view && config.part && config.rel) {
        this.visualization(view(width, config.height || 200));
        this.tree(T.tree(config.part, config.rel, config.depth, config.scaling));
      }
    }

    visualize.prototype.render_into = function() {
      return this.el_value[0];
    };

    visualize.prototype.read = function() {
      this.el_edit.hide();
      this.el.show();
      return this.attr('instance', this.parent.instance());
    };

    visualize.prototype.edit = function() {
      return this.el.hide();
    };

    visualize.prototype.handle_failure = function(reason) {
      return this.el.hide();
    };

    return visualize;

  })(Visualize);

}).call(this);
}, "fe/controllers/wf_notice": function(exports, require, module) {(function() {
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  window.WfNotice = (function(_super) {

    __extends(WfNotice, _super);

    WfNotice.include(BasicWorkflow);

    WfNotice.include(WorkflowSimpleEvents);

    WfNotice.include(WorkflowSimpleStates);

    WfNotice.prototype.events = {
      'click [data-event]': 'click_button'
    };

    function WfNotice() {
      this.click_button = __bind(this.click_button, this);

      this._append_buttons = __bind(this._append_buttons, this);

      this._append_text = __bind(this._append_text, this);

      this.dust_context = __bind(this.dust_context, this);

      var _this = this;
      WfNotice.__super__.constructor.apply(this, arguments);
      this._init_workflow();
      this._timeouts = [];
      this.states(['success', 'notice', 'error']);
      this.state('notice');
      this.dust_template('workflow/notice', true);
      this.attr('dust_context', this.dust_context);
      this.on_render(this._append_text);
      this.on_render(this._append_buttons);
      this.on_before('close', function() {
        _this.attr('cancel_timeout', true);
        return _this.release();
      });
      this.on_before('cancel_timeout', function() {
        return _this.attr('cancel_timeout', true);
      });
      this.release(function() {
        return _.each(_this._timeouts, clearTimeout);
      });
    }

    WfNotice.prototype.dust_context = function() {
      return dust.makeBase().push({
        heading: this.attr('heading'),
        type: this.state()
      });
    };

    WfNotice.prototype._append_text = function() {
      var li, t, text, ul, _i, _len;
      text = this.attr('text');
      ul = $('<ul class=alert-details>');
      if (!_.isArray(text)) {
        text = [text];
      }
      for (_i = 0, _len = text.length; _i < _len; _i++) {
        t = text[_i];
        li = $('<li class=alert-detail>');
        li.text(t);
        ul.append(li);
      }
      return this.el.append(ul);
    };

    WfNotice.prototype._append_buttons = function() {
      var b, button, p, timeout, _i, _len, _ref, _ref1, _ref2, _ref3;
      timeout = this.attr('timeout');
      if (this.attr('buttons')) {
        p = $("<p>");
        _ref = this.attr('buttons');
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          button = _ref[_i];
          switch (this.state()) {
            case 'success':
              if ((_ref1 = button["class"]) == null) {
                button["class"] = 'btn-success';
              }
              break;
            case 'error':
              if ((_ref2 = button["class"]) == null) {
                button["class"] = 'btn-danger';
              }
              break;
            case 'notice':
              if ((_ref3 = button["class"]) == null) {
                button["class"] = 'btn-warning';
              }
          }
          b = $("<button class='alert-button btn " + button["class"] + "' data-event=" + button.event + ">");
          this._button_text(b, timeout, button);
          p.append(b);
        }
        return this.el.append(p);
      }
    };

    WfNotice.prototype._button_text = function(b, timeout, button) {
      var _this = this;
      if (timeout && timeout.event === button.event && timeout.seconds > 0 && !this.attr('cancel_timeout')) {
        b.html("" + timeout.seconds + " &rarr; " + button.text);
        timeout.seconds -= 1;
        return this._timeouts.push(setTimeout((function() {
          return _this._button_text(b, timeout, button);
        }), 1000));
      } else {
        return b.html(button.text);
      }
    };

    WfNotice.prototype.add_button = function(event, text, opts) {
      var buttons, _ref,
        _this = this;
      if (opts == null) {
        opts = {};
      }
      buttons = (_ref = this.attr('buttons')) != null ? _ref : [];
      buttons.push({
        event: event,
        text: text,
        "class": opts["class"]
      });
      this.attr('buttons', buttons);
      if (opts.close) {
        this.on_after(event, this.release);
      }
      if (opts.back) {
        this.on_after(event, function() {
          return history.back();
        });
      }
      if (opts.remove_button) {
        this.on_after(event, function() {
          return _this.el.find("[data-event=\"" + event + "\"]").remove();
        });
      }
      return this;
    };

    WfNotice.prototype.last_for = function(seconds, event) {
      var _this = this;
      this.attr('timeout', {
        seconds: seconds,
        event: event
      });
      this.on_after('timeout', this.release);
      return this.on_render(function() {
        return _this._timeouts.push(setTimeout(_this.trigger_timeout(event), seconds * 1000));
      });
    };

    WfNotice.prototype.scroll_to_view = function() {
      return this.el.scrollIntoView();
    };

    WfNotice.prototype.trigger_timeout = function(event) {
      var _this = this;
      return function() {
        if (!_this.attr('cancel_timeout')) {
          return _this.event(event || 'timeout');
        }
      };
    };

    WfNotice.prototype.remove_button = function(event) {
      this.$("[data-event=" + event + "]").remove();
      return this;
    };

    WfNotice.prototype.click_button = function(e) {
      return this.event(e.target.dataset.event);
    };

    return WfNotice;

  })(Spine.Controller);

}).call(this);
}, "fe/controllers/wf_topbar": function(exports, require, module) {(function() {
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  window.WfTopbar = (function(_super) {

    __extends(WfTopbar, _super);

    WfTopbar.prototype.className = 'navbar wf-topbar';

    WfTopbar.include(BasicWorkflow);

    WfTopbar.include(WorkflowSimpleStates);

    WfTopbar.prototype.events = {
      'click .nav > li > a': '_click_section',
      'click [data-event]': '_click_button'
    };

    function WfTopbar() {
      this.may_render = __bind(this.may_render, this);

      this.on_page = __bind(this.on_page, this);

      this.set_visible = __bind(this.set_visible, this);

      this._click_button = __bind(this._click_button, this);

      this.dust_context = __bind(this.dust_context, this);

      var _this = this;
      WfTopbar.__super__.constructor.apply(this, arguments);
      this._init_workflow();
      this.attr('page_type', function() {
        return _this.attr('workflow').attr('page_type');
      });
      this.attr('model_name', function() {
        return _this.attr('workflow').attr('model_name');
      });
      this.dust_template('workflow/topbar', true);
      this.on_change('workflow', this.on_page);
      this.on_change('page_type', this.may_render);
      this.attr('dust_context', this.dust_context);
      this.on_render(function() {
        return _this.set_visible(_this, {
          to: _this.visible_menu()
        });
      });
    }

    WfTopbar.prototype.button_for_event = function(event_name) {
      return this.$("[data-event=" + event_name + "]");
    };

    WfTopbar.prototype.dust_context = function() {
      return dust.makeBase().push({
        name: this.attr('page_type'),
        model_name: this.attr('model_name'),
        display_name: this.display_name(),
        menu: this.menu()
      });
    };

    WfTopbar.prototype.visible_menu = function() {
      var _ref, _ref1, _ref2;
      return ((_ref = this.workflow()) != null ? typeof _ref.state === "function" ? _ref.state() : void 0 : void 0) || ((_ref1 = this.menu()) != null ? (_ref2 = _ref1[0]) != null ? _ref2.state : void 0 : void 0);
    };

    WfTopbar.prototype._click_button = function(e) {
      if (e != null) {
        e.preventDefault();
      }
      return this.workflow().event(e.currentTarget.dataset.event);
    };

    WfTopbar.prototype.set_visible = function(wf, e) {
      this.$("[data-state]").hide();
      return this.$("[data-state=" + e.to + "]").show();
    };

    WfTopbar.prototype.on_page = function(_, page) {
      page.on_change('instance', this.may_render);
      page.on_change('menu', this.may_render);
      page.on_state_change(this.set_visible);
      this.attr_accessor('display_name', page);
      return this.attr_accessor('menu', page);
    };

    WfTopbar.prototype.may_render = function() {
      if (this.attr('workflow') && this.attr('page_type') && this.menu()) {
        return this.render(this);
      }
    };

    return WfTopbar;

  })(Spine.Controller);

}).call(this);
}, "fe/controllers/workflow": function(exports, require, module) {(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  window.Workflow = (function(_super) {

    __extends(Workflow, _super);

    Workflow.save_cancel = function(wf) {
      return [
        {
          event: 'save',
          label: 'Save'
        }, {
          event: 'cancel',
          label: 'Cancel'
        }
      ];
    };

    Workflow.include(BranchWorkflow);

    Workflow.include(RootWorkflow);

    Workflow.include(WorkflowStateMachine);

    Workflow.prototype.className = 'workflow';

    function Workflow(callback) {
      Workflow.__super__.constructor.call(this);
      this.topbar(new WfTopbar);
      if (typeof callback === "function") {
        callback(this);
      }
    }

    return Workflow;

  })(BaseController);

}).call(this);
}, "fe/controllers/workflow/map": function(exports, require, module) {(function() {
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Workflow.map = (function(_super) {
    var MAPS_API_KEY;

    __extends(map, _super);

    MAPS_API_KEY = 'AIzaSyD-t7WaRDQOgI8Q5zCnojCmzbZ13LQAayw';

    map.prototype.width = 700;

    map.prototype.height = 113;

    map.prototype.zoom = 12;

    map.prototype.elements = {
      '.dv-value': 'el_read',
      '.dv-edit': 'el_edit'
    };

    function map() {
      this.render = __bind(this.render, this);
      map.__super__.constructor.apply(this, arguments);
      this.on_change('instance', this.render());
      this.el_edit.remove();
    }

    map.prototype.read = function() {
      this.el.show();
      return this.render();
    };

    map.prototype.edit = function() {
      return this.el.hide();
    };

    map.prototype._address = function() {
      return this.parent.instance().attr(this.el.data('address'));
    };

    map.prototype._image_url = function(address) {
      var encoded_address, image_url;
      encoded_address = encodeURIComponent(address);
      image_url = "https://maps.googleapis.com/maps/api/staticmap?sensor=false&";
      image_url += "center=" + encoded_address + "&";
      image_url += "zoom=" + this.zoom + "&";
      image_url += "size=" + this.width + "x" + this.height + "&";
      if (this._is_retina()) {
        image_url += "scale=2&";
      }
      image_url += "markers=" + encoded_address + "&";
      return image_url += "key=" + MAPS_API_KEY;
    };

    map.prototype._link_url = function(address) {
      return "https://maps.google.ca/maps?q=" + (encodeURIComponent(address)) + "&z=" + this.zoom;
    };

    map.prototype.render = function() {
      var address, image_url, link_url;
      address = this._address();
      if (!address) {
        this.el.hide();
        return;
      } else {
        this.el.show();
      }
      image_url = this._image_url(address);
      link_url = this._link_url(address);
      return this.el_read.html("      <a href=\"" + link_url + "\" target=\"_blank\">        <img src=\"" + image_url + "\" class=\"thumbnail map\" width=" + this.width + " height=" + this.height + " alt=\"" + address + "\">      </a>");
    };

    return map;

  })(BaseController);

}).call(this);
}, "fe/controllers/workflow/module": function(exports, require, module) {(function() {
  var __slice = [].slice;

  window.DustTemplate = {
    render: function(wf) {
      var context;
      if (wf == null) {
        wf = this;
      }
      wf.render_workflow();
      context = wf.attr('dust_context');
      console.log("about to render ", wf.attr('dust_template'));
      dust.render(wf.attr('dust_template'), context, function(err, html) {
        if (err) {
          console.log("error", err);
          return wf.attr('error', err);
        } else {
          if (wf.attr('dust_replace')) {
            wf.replace($(html));
          } else {
            wf.append(html);
          }
          wf._rendered(context);
          return console.log("rendered", wf.attr('dust_template'));
        }
      });
      return this;
    }
  };

  window.BasicWorkflow = {
    instance: function(inst) {
      return this.attr('instance', inst);
    },
    call: function(fn) {
      fn(this);
      return this;
    },
    dust_template: function(template, replace) {
      var _this = this;
      if (template != null) {
        this.attr('dust_template', template);
        if (!this.attr('dust_context')) {
          this.attr('dust_context', function() {
            return dust.makeBase(_this.attr('dust_data'));
          });
        }
        if (replace != null) {
          this.attr('dust_replace', replace);
        }
        this.render = DustTemplate.render;
        return this;
      } else {
        return this.attr('dust_template');
      }
    },
    link_attrs: function() {
      var name, names, other, _i, _j, _len,
        _this = this;
      names = 2 <= arguments.length ? __slice.call(arguments, 0, _i = arguments.length - 1) : (_i = 0, []), other = arguments[_i++];
      for (_j = 0, _len = names.length; _j < _len; _j++) {
        name = names[_j];
        this.attr(name, other.attr(name));
        other.on_change(name, function(_, v) {
          return _this.attr(name, v);
        });
        this.on_change(name, function(_, v) {
          return other.attr(name, v);
        });
      }
      return this;
    },
    attr: function(name, value, trigger) {
      var old_value;
      if (value != null) {
        old_value = this.options[name];
        if (trigger === true || !_.isEqual(value, old_value)) {
          this.options[name] = value;
          if (trigger !== false) {
            this.trigger_change(name, old_value);
          }
        }
        return this;
      } else {
        return d3.functor(this.options[name])(this);
      }
    },
    trigger_change: function(name, old_value) {
      var method, _i, _len, _ref, _results;
      _ref = this.on_change(name);
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        method = _ref[_i];
        _results.push(method(this, this.options[name], name, old_value));
      }
      return _results;
    },
    attr_accessor: function(name, source) {
      if (source == null) {
        source = this;
      }
      this[name] = function(value) {
        return source.attr(name, value);
      };
      this["on_" + name + "_change"] = function(fn) {
        return source.on_change(name, fn);
      };
      if (source !== this) {
        this["" + name + "_source"] = source;
      }
      return this;
    },
    on_change: function(name, fn) {
      var n, _base, _i, _len, _ref, _ref1;
      if (fn != null) {
        if (_.isArray(name)) {
          for (_i = 0, _len = name.length; _i < _len; _i++) {
            n = name[_i];
            this.on_change(n).push(fn);
          }
        } else {
          this.on_change(name).push(fn);
        }
        return this;
      } else {
        if ((_ref = this.__on_change) == null) {
          this.__on_change = {};
        }
        return (_ref1 = (_base = this.__on_change)[name]) != null ? _ref1 : _base[name] = [];
      }
    },
    on_all_set: function() {
      var callback, f, n, names, _i, _j, _len;
      names = 2 <= arguments.length ? __slice.call(arguments, 0, _i = arguments.length - 1) : (_i = 0, []), callback = arguments[_i++];
      f = function(wf, value, name) {
        var n, results;
        results = (function() {
          var _j, _len, _results;
          _results = [];
          for (_j = 0, _len = names.length; _j < _len; _j++) {
            n = names[_j];
            _results.push(wf.attr(n));
          }
          return _results;
        })();
        if (_.all(results, _.identity)) {
          return callback.apply(null, [wf].concat(__slice.call(results)));
        }
      };
      for (_j = 0, _len = names.length; _j < _len; _j++) {
        n = names[_j];
        this.on_change(n, f);
      }
      return this;
    },
    when_all_set: function() {
      var callback, f, names, toggle_attr, _i,
        _this = this;
      names = 2 <= arguments.length ? __slice.call(arguments, 0, _i = arguments.length - 1) : (_i = 0, []), callback = arguments[_i++];
      toggle_attr = 'when_all_set ' + names;
      this.attr(toggle_attr, true);
      f = function() {
        var toggle, values, wf;
        wf = arguments[0], toggle = arguments[1], values = 3 <= arguments.length ? __slice.call(arguments, 2) : [];
        _this.attr(toggle_attr, false);
        return callback.apply(null, [wf].concat(__slice.call(values)));
      };
      return this.on_all_set.apply(this, [toggle_attr].concat(__slice.call(names), [f]));
    },
    on_state_change: function(fn) {
      var _ref;
      if (fn != null) {
        this.on_state_change().push(fn);
        return this;
      } else {
        return (_ref = this.__on_state_change) != null ? _ref : this.__on_state_change = [];
      }
    },
    root: function() {
      var _ref;
      return (_ref = this.workflow()) != null ? _ref.root() : void 0;
    },
    workflow: function(wf) {
      return this.attr('workflow', wf);
    },
    _init_workflow: function() {
      var _ref,
        _this = this;
      this.controllers = [];
      if ((_ref = this.options) == null) {
        this.options = {};
      }
      return typeof this.release === "function" ? this.release(function() {
        var _ref1;
        _this._release_controllers();
        if (typeof _this.clear_notices === "function") {
          _this.clear_notices(_this, true);
        }
        return (_ref1 = _this._topbar) != null ? _ref1.release() : void 0;
      }) : void 0;
    },
    _release_controllers: function() {
      return typeof this._each_controller === "function" ? this._each_controller('release') : void 0;
    },
    _each_controller: function() {
      var args, c, method, _base, _i, _len, _ref;
      method = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      _ref = this.controllers;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        c = _ref[_i];
        if (typeof (_base = c.controller)[method] === "function") {
          _base[method].apply(_base, args);
        }
      }
      return this;
    },
    render_workflow: function() {
      var _ref;
      this._pre_render();
      if (typeof this._fsm_before_render === "function") {
        this._fsm_before_render();
      }
      return (_ref = this._topbar) != null ? _ref.render() : void 0;
    },
    render: function(wf) {
      if (wf == null) {
        wf = this;
      }
      wf.render_workflow();
      wf._rendered();
      return this;
    },
    _pre_render: function() {
      var method, _i, _len, _ref, _results;
      _ref = this.before_render();
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        method = _ref[_i];
        _results.push(method(this));
      }
      return _results;
    },
    _rendered: function(arg) {
      var method, _i, _len, _ref, _results;
      _ref = this.on_render();
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        method = _ref[_i];
        _results.push(method(this, arg));
      }
      return _results;
    },
    on_render: function(fn) {
      var _ref;
      if (fn != null) {
        this.on_render().push(fn);
        return this;
      } else {
        return (_ref = this.__on_render) != null ? _ref : this.__on_render = [];
      }
    },
    before_render: function(fn) {
      var _ref;
      if (fn != null) {
        this.before_render().push(fn);
        return this;
      } else {
        return (_ref = this.__before_render) != null ? _ref : this.__before_render = [];
      }
    },
    prevent_default: function() {
      return window.event.preventDefault();
    }
  };

  window.BranchWorkflow = {
    shows: function(name, method) {
      if (method == null) {
        method = 'slideDown';
      }
      return function(wf) {
        var _ref;
        return (_ref = wf.controller(name)) != null ? _ref.el[method]() : void 0;
      };
    },
    hides: function(name, method) {
      if (method == null) {
        method = 'slideUp';
      }
      return function(wf) {
        var _ref;
        return (_ref = wf.controller(name)) != null ? _ref.el[method]() : void 0;
      };
    },
    calls: function() {
      var args, method, name;
      name = arguments[0], method = arguments[1], args = 3 <= arguments.length ? __slice.call(arguments, 2) : [];
      return function(wf) {
        var _ref;
        return (_ref = wf.controller(name)) != null ? typeof _ref[method] === "function" ? _ref[method].apply(_ref, args) : void 0 : void 0;
      };
    },
    releases: function(name) {
      return function(wf) {
        var _ref;
        return (_ref = wf.remove(name)) != null ? _ref.release() : void 0;
      };
    },
    detaches_all: function() {
      return function(wf) {
        var c, _i, _len, _ref, _results;
        _ref = wf.controllers;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          c = _ref[_i];
          _results.push(c.el.detach());
        }
        return _results;
      };
    },
    detaches: function(name) {
      return function(wf) {
        return wf.controller(name).el.detach();
      };
    },
    attaches: function(name) {
      return function(wf) {
        return wf.append(wf.controller(name));
      };
    },
    appends: function(name, value) {
      return function(wf) {
        var c;
        c = d3.functor(value)(wf, name);
        return wf.controller(name, c);
      };
    },
    renders: function(name, arg) {
      return function(wf) {
        var c;
        c = wf.controller(name);
        return c.render(c, d3.functor(arg)(wf, c));
      };
    },
    cascades_to: function() {
      var controller_names;
      controller_names = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      if (controller_names.length === 1) {
        return function(wf, e, from, to) {
          return wf.controller(controller_names[0]).event(e);
        };
      } else {
        return function(wf, e, from, to) {
          var cn, _i, _len, _results;
          _results = [];
          for (_i = 0, _len = controller_names.length; _i < _len; _i++) {
            cn = controller_names[_i];
            _results.push(wf.controller(cn).event(e));
          }
          return _results;
        };
      }
    },
    cascades: function() {
      var args, method;
      method = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      return function(wf) {
        return wf._each_controller.apply(wf, [method].concat(__slice.call(args)));
      };
    },
    render_controllers: function(wf, arg) {
      var c, _i, _len, _ref;
      _ref = wf.controllers;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        c = _ref[_i];
        c.controller.render(c.controller, arg);
        c.rendered = true;
      }
      return this;
    },
    controller: function(name, controller, position) {
      var c, existing, _i, _len, _ref;
      existing = _.find(this.controllers, function(c) {
        return c.name === name;
      });
      if (controller != null) {
        if (existing) {
          if (existing.position !== position) {
            existing.position = position;
            this.controllers = _.sortBy(this.controllers, function(c) {
              return c.position;
            });
          }
        } else {
          controller = d3.functor(controller)(this);
          if (controller) {
            if (typeof controller.workflow === "function") {
              controller.workflow(this);
            }
            c = {
              name: d3.functor(name)(this),
              controller: controller,
              position: position
            };
            if (position != null) {
              this.controllers.splice(position, 0, c);
            } else {
              this.controllers.push(c);
            }
            if (position !== false) {
              this.append(controller);
            }
          }
        }
        return this;
      } else {
        _ref = this.controllers;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          c = _ref[_i];
          if (c.name === name) {
            return c.controller;
          }
        }
        return void 0;
      }
    },
    remove: function(name) {
      var c, removed;
      removed = _.find(this.controllers, function(c) {
        return c.name === name;
      });
      if (removed) {
        this.controllers = (function() {
          var _i, _len, _ref, _results;
          _ref = this.controllers;
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            c = _ref[_i];
            if (c.name !== name) {
              _results.push(c);
            }
          }
          return _results;
        }).call(this);
        return removed.controller;
      }
    }
  };

  window.RootWorkflow = {
    notice: function(heading, text) {
      var notice, _ref,
        _this = this;
      this.clear_notices(this, true);
      if ((_ref = this.notices) == null) {
        this.notices = [];
      }
      notice = new WfNotice().attr('heading', heading).attr('text', function() {
        return text;
      }).on_before('*', function(_, e) {
        return _this.event(e);
      });
      this.prepend(notice.el);
      this.notices.push(notice);
      return notice;
    },
    good_news: function(heading, text) {
      return this.notice(heading, text).state('success');
    },
    bad_news: function(heading, text) {
      return this.notice(heading, text).state('error');
    },
    error: function(err) {
      if (typeof console !== "undefined" && console !== null) {
        console.error('error', err, err.stack);
      }
      return this.bad_news('An error occurred', err.message).render();
    },
    succeed_with: function(heading, opts) {
      var _this = this;
      if (heading == null) {
        heading = 'Server Request Successful';
      }
      if (opts == null) {
        opts = {};
      }
      return function() {
        if (opts.clear) {
          _this.clear_notices(_this);
        }
        _this.good_news(heading).render();
        if (opts.event) {
          return _this.event(opts.event);
        }
      };
    },
    fail_with: function(heading, opts) {
      var _this = this;
      if (heading == null) {
        heading = 'Server Request Failed';
      }
      if (opts == null) {
        opts = {};
      }
      return function(request) {
        var data;
        try {
          if (opts.clear) {
            _this.clear_notices(_this);
          }
          data = JSON.parse(request.responseText);
          _this.bad_news(heading, data.error).render();
        } catch (e) {
          _this.bad_news(heading, "Also unable to parse server response: " + e.message).render();
        }
        if (opts.event) {
          return _this.event(opts.event);
        }
      };
    },
    clear_notices: function(wf, even_sticky_ones) {
      var n, _i, _j, _len, _len1, _ref, _ref1;
      if (even_sticky_ones == null) {
        even_sticky_ones = false;
      }
      if (wf == null) {
        wf = this;
      }
      if (wf.notices) {
        if (even_sticky_ones) {
          _ref = wf.notices;
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            n = _ref[_i];
            n.release();
          }
          wf.notices = [];
        } else {
          _ref1 = wf.notices;
          for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
            n = _ref1[_j];
            if (!n.attr('sticky')) {
              n.release();
            }
          }
          wf.notices = (function() {
            var _k, _len2, _ref2, _results;
            _ref2 = wf.notices;
            _results = [];
            for (_k = 0, _len2 = _ref2.length; _k < _len2; _k++) {
              n = _ref2[_k];
              if (n.attr('sticky')) {
                _results.push(n);
              }
            }
            return _results;
          })();
        }
      } else {
        wf.notices = [];
      }
      return this;
    },
    topbar: function(topbar) {
      if (topbar != null) {
        this.remove_topbar();
        this._topbar = topbar;
        if (typeof topbar.workflow === "function") {
          topbar.workflow(this);
        }
        window.menu.add_bar(topbar);
        return this;
      } else {
        return this._topbar;
      }
    },
    remove_topbar: function() {
      if (this._topbar) {
        window.menu.remove_bar(this._topbar);
      }
      return this;
    },
    title: function(str) {
      var r;
      r = this.attr('page_title', str);
      if (str != null) {
        this.update_title();
      }
      return r;
    },
    update_title: function(wf) {
      if (wf == null) {
        wf = this;
      }
      return document.title = wf.attr('page_title');
    }
  };

}).call(this);
}, "fe/controllers/workflow/rel": function(exports, require, module) {(function() {
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Workflow.Rel = {};

  Workflow.rel = (function(_super) {

    __extends(rel, _super);

    function rel() {
      this._on_related_record_saved = __bind(this._on_related_record_saved, this);

      this.set_selected = __bind(this.set_selected, this);

      this._trigger_search = __bind(this._trigger_search, this);

      this.over_xnid = __bind(this.over_xnid, this);

      this.handle_deselect = __bind(this.handle_deselect, this);

      this.handle_select = __bind(this.handle_select, this);

      this.handle_keydown = __bind(this.handle_keydown, this);
      this._name = '';
      this.selection = -1;
      this.trigger_search = _.debounce(this._trigger_search, 250);
      this.events = this.events();
      rel.__super__.constructor.apply(this, arguments);
      this._hide_empty = this.el.data('hide') === 'empty';
    }

    rel.prototype.show_hide = function(value, into) {
      if (!value || value.length === 0) {
        if (this._hide_empty) {
          this.el.hide();
        }
        into.hide();
        return false;
      } else {
        if (this._hide_empty) {
          this.el.show();
        }
        into.show();
        return true;
      }
    };

    rel.prototype.fsm_events = [
      {
        name: 'load',
        from: 'initial',
        to: 'loaded'
      }, {
        name: 'edit',
        from: 'loaded',
        to: 'editing'
      }, {
        name: 'edit',
        from: 'reading',
        to: 'editing'
      }, {
        name: 'read',
        from: 'loaded',
        to: 'reading'
      }, {
        name: 'read',
        from: 'editing',
        to: 'reading'
      }, {
        name: 'exit',
        from: 'reading',
        to: 'unloaded'
      }, {
        name: 'exit',
        from: 'editing',
        to: 'unloaded'
      }, {
        name: 'read',
        from: 'open_search',
        to: 'editing'
      }, {
        name: 'read',
        from: 'selecting',
        to: 'open'
      }, {
        name: 'read',
        from: 'open',
        to: 'closed'
      }, {
        name: 'read',
        from: 'closed',
        to: 'editing'
      }, {
        name: 'exit',
        from: 'open_search',
        to: 'editing'
      }, {
        name: 'exit',
        from: 'selecting',
        to: 'open'
      }, {
        name: 'exit',
        from: 'open',
        to: 'closed'
      }, {
        name: 'exit',
        from: 'closed',
        to: 'editing'
      }, {
        name: 'focus',
        from: 'editing',
        to: 'closed'
      }, {
        name: 'blur',
        from: 'closed',
        to: 'editing'
      }, {
        name: 'blur',
        from: 'open',
        to: 'closed'
      }, {
        name: 'click_input',
        from: 'closed',
        to: 'open'
      }, {
        name: 'click_input',
        from: 'open',
        to: 'closed'
      }, {
        name: 'click_input',
        from: 'selecting',
        to: 'closed'
      }, {
        name: 'click_input',
        from: 'open_search',
        to: 'editing'
      }, {
        name: 'show_results',
        from: 'closed',
        to: 'open'
      }, {
        name: 'show_results',
        from: 'open'
      }, {
        name: 'toggle_search',
        from: 'open',
        to: 'closed'
      }, {
        name: 'toggle_search',
        from: 'closed',
        to: 'editing'
      }, {
        name: 'toggle_search',
        from: 'editing',
        to: 'open_search'
      }, {
        name: 'toggle_search',
        from: 'open_search',
        to: 'editing'
      }, {
        name: 'click_create',
        from: 'open',
        to: 'closed'
      }, {
        name: 'click_create',
        from: 'closed',
        to: 'editing'
      }, {
        name: 'click_create',
        from: 'editing',
        to: 'editing'
      }, {
        name: 'esc',
        from: 'open_search',
        to: 'editing'
      }, {
        name: 'esc',
        from: 'open',
        to: 'closed'
      }, {
        name: 'tab',
        from: 'open',
        to: 'closed'
      }, {
        name: 'select',
        from: 'open',
        to: 'closed'
      }, {
        name: 'no_results',
        from: 'open',
        to: 'closed'
      }, {
        name: 'up',
        from: 'open'
      }, {
        name: 'down',
        from: 'open'
      }, {
        name: 'up',
        from: 'closed',
        to: 'open'
      }, {
        name: 'down',
        from: 'closed',
        to: 'open'
      }, {
        name: 'mousedown',
        from: 'open',
        to: 'selecting'
      }, {
        name: 'blur',
        from: 'selecting',
        to: 'open'
      }, {
        name: 'clear',
        from: 'selecting',
        to: 'open'
      }, {
        name: 'select',
        from: 'selecting',
        to: 'closed'
      }
    ];

    rel.prototype.events = function() {
      var _this = this;
      return {
        'focus     .rel-name-search': function(e) {
          return _this.fsm.focus(e);
        },
        'blur      .rel-name-search': function(e) {
          return _this.fsm.blur(e);
        },
        'mousedown .rel-name-search': function(e) {
          return _this.fsm.click_input(e);
        },
        'keydown   .rel-name-search': this.handle_keydown,
        'click     .rel-full-search': function(e) {
          return _this.fsm.toggle_search(e);
        },
        'mousedown .quick-search-results': function(e) {
          return _this.fsm.mousedown(e);
        },
        'mouseover .quick-search-results [data-xnid]': this.over_xnid,
        'click     .quick-search-results [data-xnid]': function(e) {
          return _this.fsm.select(e);
        },
        'click     .rel-create': function(e) {
          return _this.fsm.click_create(e);
        }
      };
    };

    rel.prototype.elements = {
      '.dv-value': 'el_value',
      '.dv-edit': 'el_edit',
      '.dv-label': 'el_label',
      'input': 'el_input',
      '.rel-full-search': 'el_full_search',
      '.wf-selected-results': 'el_results'
    };

    rel.prototype.handle_keydown = function(e) {
      e.stopPropagation();
      switch (e.keyCode) {
        case 27:
          return this.fsm.esc(e);
        case 9:
          return this.fsm.tab(e);
        case 13:
          return this.fsm.select(e);
        case 38:
          if (this.result_count()) {
            return this.fsm.up(e);
          }
          break;
        case 40:
          if (this.result_count()) {
            return this.fsm.down(e);
          }
          break;
        default:
          return this.trigger_search();
      }
    };

    rel.prototype.handle_select = function(inst) {
      throw new Error('handle_select option not specified');
    };

    rel.prototype.handle_deselect = function(inst) {
      throw new Error('handle_deselect option not specified');
    };

    rel.prototype.over_xnid = function(e) {
      var xnid,
        _this = this;
      xnid = e.currentTarget.dataset.xnid;
      return this.name_panel().instances().some(function(inst, idx) {
        if (inst.xnid() === xnid) {
          _this.change_selection(idx);
          return true;
        }
      });
    };

    rel.prototype.ontoggle_search = function(n, from, to, e) {
      if (e != null) {
        e.preventDefault();
      }
      if (from === 'open') {
        return this.fsm.toggle_search();
      }
    };

    rel.prototype.onclick_create = function(n, from, to, e) {
      this.releasing_bind(Spine, 'related_record_saved', this._on_related_record_saved);
      if (!(from === 'editing' && to === 'editing')) {
        return this.fsm.click_create();
      }
    };

    rel.prototype.onedit = function(n, from, to, base_ctx) {
      var _this = this;
      if (to !== 'editing') {
        return;
      }
      if (this.metadata().read_only) {
        return this.read();
      }
      if (base_ctx == null) {
        base_ctx = dust.makeBase();
      }
      this.editing = true;
      this.el_edit.removeClass('hide');
      if (this.rendered_edit) {
        return this._render_value(this.el_results);
      } else {
        this.rendered_edit = true;
        return dust.render(this.edit_template, base_ctx.push(this.edit_context()), function(err, html) {
          _this.el_edit.html(html);
          _this.el_edit.find('.rel-create-form').attr('action', "/create" + (Spine.Route.getPath()) + "/rel/" + _this.name);
          _this.refreshElements();
          _this.rel(function(rel) {
            _this.resource = rel.available();
            if (_this.el_input) {
              _this.el_input.after('<div class="quick-search-results hide"></div>');
              _this.el_name_results = _this.el_edit.find('.quick-search-results');
            }
            _this.bind('change', _this.set_selected);
            if (_this.value()) {
              return _this.set_selected(_.union(_this.value()));
            } else {
              return _this.set_selected([]);
            }
          });
          return _this._render_value(_this.el_results);
        });
      }
    };

    rel.prototype.onreading = function(n, from, to) {
      this.el_edit.addClass('hide');
      this.editing = false;
      this.el_value.removeClass('hide');
      return this._render_value(this.el_value);
    };

    rel.prototype.onread = function() {
      if (this.fsm.can('read')) {
        return this.fsm.read();
      }
    };

    rel.prototype.onexit = function() {
      if (this.fsm.can('exit')) {
        return this.fsm.exit();
      }
    };

    rel.prototype.onblur = function(n, from, to) {
      if (from === 'selecting') {
        return this.el_input[0].focus();
      } else if (to !== 'editing') {
        return this.fsm.blur();
      }
    };

    rel.prototype.onup = function(n, from, to, e) {
      var sel;
      e.preventDefault();
      if (this.result_count() > 0) {
        sel = this.selection - 1;
        if (sel < 0) {
          sel = this.result_count() - 1;
        }
        return this.change_selection(sel);
      }
    };

    rel.prototype.ondown = function(n, from, to, e) {
      var sel;
      e.preventDefault();
      if (this.result_count() > 0) {
        sel = this.selection + 1;
        if (sel >= this.result_count()) {
          sel = 0;
        }
        return this.change_selection(sel);
      }
    };

    rel.prototype.onbeforeselect = function(n, from, to, e) {
      var inst;
      if (this.selection >= 0) {
        inst = this.name_panel().instances()[this.selection];
        if (inst) {
          return this.handle_select(inst);
        }
      }
    };

    rel.prototype.onopen = function(n, from, to, e) {
      return this.el_name_results.show();
    };

    rel.prototype.onleaveopen = function(n, from, to) {
      if (to !== 'selecting') {
        this.change_selection(-1);
      }
      return true;
    };

    rel.prototype.onclosed = function(e) {
      return this.el_name_results.hide();
    };

    rel.prototype.onopen_search = function() {
      this.trigger('show_popover');
      this.popover().show();
      return this.el_full_search.addClass('btn-primary');
    };

    rel.prototype.onleaveopen_search = function() {
      this.popover().hide();
      return this.el_full_search.removeClass('btn-primary');
    };

    rel.prototype.onloaded = function() {};

    rel.prototype.rel = function(callback) {
      var _ref;
      if ((_ref = this._rel) == null) {
        this._rel = this.instance().type().relationship(this.name);
      }
      if (callback) {
        this._rel.load(callback);
      }
      return this._rel;
    };

    rel.prototype.result_count = function() {
      if (this.name_search_text()) {
        return this.name_panel().instances().length;
      } else {
        return 0;
      }
    };

    rel.prototype.change_selection = function(sel) {
      var _ref, _ref1;
      if (this.selection >= 0) {
        if ((_ref = this.name_panel().results()[this.selection]) != null) {
          _ref.el.removeClass('active');
        }
      }
      this.selection = sel;
      if (sel >= 0) {
        return (_ref1 = this.name_panel().results()[this.selection]) != null ? _ref1.el.addClass('active') : void 0;
      }
    };

    rel.prototype.name_search_text = function() {
      return this.el_input.val();
    };

    rel.prototype._trigger_search = function() {
      return this.find(this.name_search_text());
    };

    rel.prototype.popover = function() {
      var _this = this;
      if (this._popover) {
        return this._popover;
      }
      this._popover = new Popover({
        title: "" + (this.label()) + ": Full Search",
        content: this.full_search(),
        side: 'center',
        width: 0.8,
        height: 0.6,
        anchor: this.el_full_search,
        prevent_container_scroll: true,
        buttons: [
          {
            event: 'hide',
            label: 'OK',
            "class": 'btn-primary'
          }
        ],
        should_click_dismiss: function(e) {
          return e.target.parentNode && !_this.is_descendant($(e.target));
        }
      });
      this._popover.bind('hide', function() {
        if (_this.fsm.can('toggle_search')) {
          return _this.fsm.toggle_search();
        }
      });
      return this._popover;
    };

    rel.prototype.set_selected = function(insts) {
      if (this._full_search_panel) {
        return this._full_search_panel.set_selected(insts, false);
      } else {
        return this._current_selection = insts;
      }
    };

    rel.prototype._on_related_record_saved = function(e) {
      var _ref;
      if (e.id !== ((_ref = this.instance()) != null ? _ref.id() : void 0) || e.rel_name !== this._rel.name) {
        return;
      }
      return this._rel.type().find(e.rel_id).then(this.handle_select, function(err) {
        return console.error(err);
      });
    };

    rel.prototype.find = function(text) {
      if (this.fsm.can('show_results') && text !== this._name) {
        this.fsm.show_results();
        this._name = text;
        if (text) {
          this.name_panel().set_filter('name', {
            regex: text
          });
          return this.name_panel().update();
        } else {
          this.name_panel().remove_filter('name');
          this.name_panel().clear();
          this.fsm.no_results();
          return this.change_selection(-1);
        }
      }
    };

    rel.prototype.name_panel = function() {
      if (this._name_panel) {
        return this._name_panel;
      }
      this._name_panel = this.name_search().panels[0];
      this.el_name_results.html(this.name_search().el);
      return this._name_panel;
    };

    rel.prototype.name_search = function() {
      if (this._name_search) {
        return this._name_search;
      }
      return this._name_search = new Search({
        action_bar: false,
        based_on: this.resource,
        sidebar: false,
        className: 'popover-search',
        panel: {
          auto_update: false,
          template: null,
          active_size: 'compact',
          className: 'search-results',
          show_model: false,
          include_invisible: true,
          select_one: this.select_one,
          handle: false,
          limit: 15,
          navigate: false,
          min_width: this.el_name_results.width(),
          max_width: this.el_name_results.width()
        }
      });
    };

    rel.prototype.full_search = function() {
      if (this._full_search) {
        return this._full_search;
      }
      this._full_search = new Search({
        action_bar: false,
        name: dust.filters.capitalize(this.name),
        hide_creation_options: true,
        based_on: this.resource,
        className: 'popover-search box-layout',
        panel: {
          template: null,
          active_size: 'medium',
          className: 'search-results',
          show_model: false,
          include_invisible: true,
          navigate: false,
          select_one: this.select_one
        }
      });
      this._full_search_panel = this._full_search.panels[0];
      this._full_search_panel.search_results.bind('select', this.handle_select);
      this._full_search_panel.search_results.bind('deselect', this.handle_deselect);
      this._full_search_panel.add_instances(this.original_value());
      this._full_search_panel.set_selected(this.value(), false);
      this._current_selection = void 0;
      return this._full_search;
    };

    rel.prototype._release = function() {
      var _ref, _ref1, _ref2;
      if ((_ref = this._full_search) != null) {
        _ref.release();
      }
      if ((_ref1 = this._name_search) != null) {
        _ref1.release();
      }
      if ((_ref2 = this._popover) != null) {
        _ref2.release();
      }
      return rel.__super__._release.apply(this, arguments);
    };

    return rel;

  })(Workflow.Type);

}).call(this);
}, "fe/controllers/workflow/rel/many": function(exports, require, module) {(function() {
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Workflow.Rel.many = (function(_super) {

    __extends(many, _super);

    function many() {
      this.handle_select = __bind(this.handle_select, this);

      this.handle_deselect = __bind(this.handle_deselect, this);
      return many.__super__.constructor.apply(this, arguments);
    }

    many.prototype.edit_template = 'workflow/type/one_rel';

    many.prototype.original_value = function() {
      return this.instance().original().many_rel(this.name);
    };

    many.prototype.value = function(opt_cb) {
      if (opt_cb) {
        return this.instance().many_rel(this.name, opt_cb);
      } else {
        return this.instance().many_rel(this.name);
      }
    };

    many.prototype._render_value = function(into) {
      var _this = this;
      return this.rel(function(rel) {
        var rel_type;
        if (_this.results && _this.results.el.parent() !== into) {
          _this.results.release();
          _this.results = null;
        }
        if (!_this.results) {
          _this.results = new SearchResults({
            size: _this.options.size || 'medium',
            show_details: true,
            show_model: false,
            handle: _this.editing,
            navigate: !_this.editing,
            select_all: _this.editing,
            show_id: false
          });
          into.html(_this.results.el);
          _this.results.bind('deselect', _this.handle_deselect);
        }
        if (rel.valid) {
          rel_type = rel.type();
        } else {
          rel_type = Xn.partial(['record']);
        }
        return rel_type.template('r/is/', function(err, template) {
          var f, value;
          if (!err) {
            _this.results.set_template(template);
          }
          f = function(e, value) {
            if (_this.show_hide(value, into)) {
              return _this.results.render_instances(value);
            } else {
              return _this.results.clear();
            }
          };
          value = _this.value();
          if (value) {
            return f(null, value);
          } else {
            return _this.value(f);
          }
        });
      });
    };

    many.prototype.handle_deselect = function(inst) {
      if (inst) {
        this.instance().many_rel(this.name, {
          remove: inst
        });
        this.trigger('change', this.value());
        return this._render_value(this.el_results);
      }
    };

    many.prototype.handle_select = function(inst) {
      if (inst) {
        this.instance().many_rel(this.name, {
          add: inst
        });
        this.trigger('change', this.value());
        return this._render_value(this.el_results);
      }
    };

    many.prototype._release = function() {
      var _ref;
      if ((_ref = this.results) != null) {
        _ref.release();
      }
      return many.__super__._release.apply(this, arguments);
    };

    return many;

  })(Workflow.rel);

}).call(this);
}, "fe/controllers/workflow/rel/one": function(exports, require, module) {(function() {
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Workflow.Rel.one = (function(_super) {

    __extends(one, _super);

    function one() {
      this.handle_select = __bind(this.handle_select, this);

      this.handle_deselect = __bind(this.handle_deselect, this);
      return one.__super__.constructor.apply(this, arguments);
    }

    one.prototype.edit_template = 'workflow/type/one_rel';

    one.prototype.select_one = true;

    one.prototype.original_value = function() {
      return this.instance().original().one_rel(this.name);
    };

    one.prototype.value = function() {
      return this.instance().one_rel(this.name);
    };

    one.prototype._render_value = function(into) {
      var value,
        _this = this;
      if (this.result) {
        this.result.release();
      }
      value = this.value();
      if (this.show_hide(value, into)) {
        return this.rel(function(rel) {
          if (rel.valid) {
            return rel.type().template('r/is/', function(err, template) {
              _this.result = new Result({
                instance: value,
                container: _this,
                template: template || 'r/default',
                size: _this.options.size || 'medium',
                handle: _this.editing,
                navigate: !_this.editing,
                selected: _this.editing,
                show_details: true
              });
              into.html(_this.result.el);
              _this.result.bind('deselect', _this.handle_deselect);
              if (template) {
                _this.result.instance = value;
                return _this.result.render();
              }
            });
          }
        });
      }
    };

    one.prototype.handle_deselect = function(inst) {
      this.instance().one_rel(this.name, null);
      this.trigger('change', []);
      return this._render_value(this.el_results);
    };

    one.prototype.handle_select = function(inst) {
      if (inst) {
        this.instance().one_rel(this.name, inst);
        this.trigger('change', [this.value()]);
        return this._render_value(this.el_results);
      }
    };

    one.prototype._release = function() {
      var _ref;
      if ((_ref = this.result) != null) {
        _ref.release();
      }
      return one.__super__._release.apply(this, arguments);
    };

    return one;

  })(Workflow.rel);

}).call(this);
}, "fe/controllers/workflow/rel/query": function(exports, require, module) {(function() {
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Workflow.Rel.query = (function(_super) {

    __extends(query, _super);

    function query() {
      this.onedit = __bind(this.onedit, this);
      return query.__super__.constructor.apply(this, arguments);
    }

    query.prototype.edit_template = 'workflow/type/query';

    query.prototype.select_one = true;

    query.prototype.original_value = function() {
      return this.instance().original().one_rel(this.name);
    };

    query.prototype.value = function() {
      return this.instance();
    };

    query.prototype.onedit = function() {
      return this.read();
    };

    query.prototype._render_value = function(into) {
      var value,
        _this = this;
      if (this.result) {
        this.result.release();
      }
      value = this.value();
      if (this.show_hide(value, into)) {
        return value.type().template('r/is/', function(err, template) {
          _this.result = new Result({
            instance: value,
            container: _this,
            template: template || 'r/default',
            size: _this.options.size || 'medium',
            handle: _this.editing,
            navigate: !_this.editing,
            selected: _this.editing,
            show_details: true
          });
          into.html(_this.result.el);
          _this.result.bind('deselect', _this.handle_deselect);
          if (template) {
            _this.result.instance = value;
            return _this.result.render();
          }
        });
      }
    };

    query.prototype._release = function() {
      var _ref;
      if ((_ref = this.result) != null) {
        _ref.release();
      }
      return query.__super__._release.apply(this, arguments);
    };

    return query;

  })(Workflow.rel);

}).call(this);
}, "fe/controllers/workflow/rel/record": function(exports, require, module) {(function() {
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Workflow.Rel.record = (function(_super) {

    __extends(record, _super);

    function record() {
      this.onedit = __bind(this.onedit, this);
      return record.__super__.constructor.apply(this, arguments);
    }

    record.prototype.edit_template = 'workflow/type/one_rel';

    record.prototype.select_one = true;

    record.prototype.original_value = function() {
      return this.instance().original().one_rel(this.name);
    };

    record.prototype.value = function() {
      return this.instance();
    };

    record.prototype.onedit = function() {
      return this.read();
    };

    record.prototype._render_value = function(into) {
      var value,
        _this = this;
      if (this.result) {
        this.result.release();
      }
      value = this.value();
      if (this.show_hide(value, into)) {
        return value.type().template('r/is/', function(err, template) {
          _this.result = new Result({
            instance: value,
            container: _this,
            template: template || 'r/default',
            size: _this.options.size || 'medium',
            handle: _this.editing,
            navigate: !_this.editing,
            selected: _this.editing,
            show_details: true
          });
          into.html(_this.result.el);
          _this.result.bind('deselect', _this.handle_deselect);
          if (template) {
            _this.result.instance = value;
            return _this.result.render();
          }
        });
      }
    };

    record.prototype._release = function() {
      var _ref;
      if ((_ref = this.result) != null) {
        _ref.release();
      }
      return record.__super__._release.apply(this, arguments);
    };

    return record;

  })(Workflow.rel);

}).call(this);
}, "fe/controllers/workflow/state_machine": function(exports, require, module) {(function() {
  var EventHandlers;

  EventHandlers = {
    on_before: function(events, fn) {
      var event, _i, _len;
      if (events === '*' && this._events) {
        events = this._events;
      }
      if (_.isArray(events)) {
        for (_i = 0, _len = events.length; _i < _len; _i++) {
          event = events[_i];
          EventHandlers._event_handler.apply(this, ["onbefore" + event, fn, true, true]);
        }
        return this;
      } else {
        event = events;
        return EventHandlers._event_handler.apply(this, ["onbefore" + event, fn, true, true]);
      }
    },
    on_after: function(events, fn) {
      var event, _i, _len;
      if (events === '*' && this._events) {
        events = this._events;
      }
      if (_.isArray(events)) {
        for (_i = 0, _len = events.length; _i < _len; _i++) {
          event = events[_i];
          EventHandlers._event_handler.apply(this, ["onafter" + event, fn]);
        }
        return this;
      } else {
        event = events;
        return EventHandlers._event_handler.apply(this, ["onafter" + event, fn]);
      }
    },
    on_enter: function(states, fn) {
      var state, _i, _len;
      if (_.isArray(states)) {
        for (_i = 0, _len = states.length; _i < _len; _i++) {
          state = states[_i];
          EventHandlers._event_handler.apply(this, ["onenter" + state, fn]);
        }
        return this;
      } else {
        state = states;
        return EventHandlers._event_handler.apply(this, ["onenter" + state, fn]);
      }
    },
    on_leave: function(states, fn) {
      var state, _i, _len;
      if (_.isArray(states)) {
        for (_i = 0, _len = states.length; _i < _len; _i++) {
          state = states[_i];
          EventHandlers._event_handler.apply(this, ["onleave" + state, fn, false, true]);
        }
        return this;
      } else {
        state = states;
        return EventHandlers._event_handler.apply(this, ["onleave" + state, fn, false, true]);
      }
    },
    _event_handler: function(key, fn, cancelable, async) {
      var functions, proto, _name, _ref, _ref1,
        _this = this;
      proto = EventHandlers._target_class.apply(this).prototype;
      if (fn != null) {
        functions = (_ref = proto[_name = "_" + key]) != null ? _ref : proto[_name] = [];
        functions.push(fn);
        if ((_ref1 = proto[key]) == null) {
          proto[key] = function(evt, from, to, arg) {
            var async_result, f, result, _i, _len;
            for (_i = 0, _len = functions.length; _i < _len; _i++) {
              f = functions[_i];
              result = f(_this, evt, from, to, arg);
              if (cancelable && result === false) {
                return false;
              }
              if (async && result === StateMachine.ASYNC) {
                async_result = result;
              }
            }
            return async_result;
          };
        }
        return this;
      } else {
        return proto["_" + key];
      }
    },
    _target_class: function() {
      var Events, _ref;
      return (_ref = this.__event_class) != null ? _ref : this.__event_class = Events = (function() {

        function Events() {}

        return Events;

      })();
    },
    target: function() {
      return new (EventHandlers._target_class.apply(this))();
    }
  };

  window.WorkflowSimpleEvents = {
    fsm: function() {
      var _ref;
      return (_ref = this._fsm) != null ? _ref : this._fsm = EventHandlers.target.apply(this);
    },
    all_events: function(events) {
      if (events != null) {
        this._events = d3.functor(events)(this);
        return this;
      } else {
        return this._events;
      }
    },
    event: function(event, arg) {
      var state, _base, _base1, _base2, _base3, _name, _name1;
      if (event != null) {
        if (!this._events || this._events.indexOf(event) >= 0) {
          this._event = event;
          state = typeof this.state === "function" ? this.state() : void 0;
          if (false !== (typeof (_base = this.fsm())[_name = "onbefore" + event] === "function" ? _base[_name](event, state, state, arg) : void 0)) {
            if (false !== (typeof (_base1 = this.fsm())["onbefore*"] === "function" ? _base1["onbefore*"](event, state, state, arg) : void 0)) {
              if (typeof (_base2 = this.fsm())[_name1 = "onafter" + event] === "function") {
                _base2[_name1](event, state, state, arg);
              }
              if (typeof (_base3 = this.fsm())["onafter*"] === "function") {
                _base3["onafter*"](event, state, state, arg);
              }
            }
          }
        }
        return this;
      } else {
        return this._event;
      }
    },
    on_before: EventHandlers.on_before,
    on_after: EventHandlers.on_after,
    can: function(event) {
      return true;
    },
    cannot: function(event) {
      return false;
    }
  };

  window.WorkflowSimpleStates = {
    fsm: function() {
      var _ref;
      return (_ref = this._fsm) != null ? _ref : this._fsm = EventHandlers.target.apply(this);
    },
    states: function(states) {
      if (states != null) {
        this._states = d3.functor(states)(this);
        return this;
      } else {
        return this._states;
      }
    },
    state: function(state, arg) {
      var method, _base, _base1, _i, _len, _name, _name1, _ref;
      if (state != null) {
        if (!this._states || this._states.indexOf(state) >= 0) {
          if (typeof (_base = this.fsm())[_name = "onleave" + this._state] === "function") {
            _base[_name](void 0, this._state, state, arg);
          }
          if (typeof (_base1 = this.fsm())[_name1 = "onenter" + state] === "function") {
            _base1[_name1](void 0, this._state, state, arg);
          }
          _ref = this.on_state_change();
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            method = _ref[_i];
            method(this, {
              from: this._state,
              to: state,
              arg: args
            });
          }
          this._state = state;
        }
        return this;
      } else {
        return this._state;
      }
    },
    with_state: function(state, fn) {
      var prev, result;
      prev = this.state();
      this.state(state);
      result = fn(this);
      this.state(prev);
      return result;
    },
    on_enter: EventHandlers.on_enter,
    on_leave: EventHandlers.on_leave
  };

  window.WorkflowStateMachine = {
    states: function(states) {
      var transition;
      if (states != null) {
        this._states = states;
        this._events = _.unique((function() {
          var _i, _len, _results;
          _results = [];
          for (_i = 0, _len = states.length; _i < _len; _i++) {
            transition = states[_i];
            _results.push(transition.name);
          }
          return _results;
        })());
        _.bindAll(this, '_on_fsm_error', '_on_fsm_state');
        this._fsm = StateMachine.create({
          initial: 'Initial',
          error: this._on_fsm_error,
          events: d3.functor(states)(this),
          target: EventHandlers.target.apply(this)
        });
        this._fsm.onchangestate = this._on_fsm_state;
        return this;
      } else {
        return this._states;
      }
    },
    fsm: function() {
      if (this._fsm != null) {
        return this._fsm;
      } else {
        this.states([]);
        return this._fsm;
      }
    },
    all_events: function() {
      var _ref;
      return (_ref = this._events) != null ? _ref : this._events = [];
    },
    on_before: EventHandlers.on_before,
    on_enter: EventHandlers.on_enter,
    on_leave: EventHandlers.on_leave,
    on_after: EventHandlers.on_after,
    can: function(event) {
      return this.all_events().indexOf(event) !== -1 && this.fsm().can(event);
    },
    cannot: function(event) {
      return this.all_events().indexOf(event) === -1 || this.fsm().cannot(event);
    },
    event: function(event, arg) {
      var _base;
      if (event != null) {
        if (this.can(event || !(this._event != null))) {
          this._event = event;
        }
        if (typeof (_base = this.fsm())[event] === "function") {
          _base[event](arg);
        }
        return this;
      } else {
        return this._event;
      }
    },
    state: function() {
      return this.fsm().current;
    },
    _on_fsm_error: function(n, from, to, args, code, message, exception) {
      console.log("can't call", n, 'when', from, '(with', [args, code, message, exception], ')');
      if (exception) {
        throw exception;
      }
    },
    _fsm_before_render: function() {
      if (this._event == null) {
        return this.event('initialize');
      }
    },
    _on_fsm_state: function(event, from, to, arg) {
      var method, _i, _len, _ref, _results;
      _ref = this.on_state_change();
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        method = _ref[_i];
        _results.push(method(this, {
          event: event,
          from: from,
          to: to,
          arg: arg
        }));
      }
      return _results;
    }
  };

}).call(this);
}, "fe/controllers/workflow/subnets": function(exports, require, module) {(function() {
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Workflow.Subnets = (function(_super) {

    __extends(Subnets, _super);

    function Subnets() {
      this.click_subnet = __bind(this.click_subnet, this);
      return Subnets.__super__.constructor.apply(this, arguments);
    }

    Subnets.prototype.onloaded = function() {
      var _this = this;
      this.subnet_tree = new window.SubnetTree({
        width: function() {
          return 500;
        }
      });
      this.el_value.append(this.subnet_tree.el);
      this.subnet_tree.subnet(void 0, new lm.Subnet6(this.instance()));
      this.subnet_tree.bind('changed', function() {
        if (_this.buttons) {
          return _this.buttons.render(_this.subnet_tree.tree, _this.subnet_tree.s6);
        }
      });
      return this.subnet_tree.bind('click', this.click_subnet);
    };

    Subnets.prototype.onreading = function() {};

    Subnets.prototype.onleavereading = function() {};

    Subnets.prototype.onedit = function() {
      var _this = this;
      this.el_edit.removeClass('hide');
      this.buttons = new SubnetScale({
        width: function() {
          return 500;
        }
      });
      this.el_value.append(this.buttons.el);
      this.el_value.append(this.subnet_tree.el);
      this.buttons.bind('add', function(add_mask) {
        _this.subnet_tree.rebuild_data(add_mask);
        return _this.subnet_tree.render();
      });
      return this.subnet_tree.trigger('changed');
    };

    Subnets.prototype.onleaveediting = function() {
      return this.buttons.release();
    };

    Subnets.prototype.click_subnet = function(d) {
      return console.log('click', d.xnid);
    };

    Subnets.prototype._release = function() {
      this.subnet_tree.release();
      this.release();
      return Subnets.__super__._release.apply(this, arguments);
    };

    return Subnets;

  })(Workflow.Type);

}).call(this);
}, "fe/controllers/workflow/table": function(exports, require, module) {(function() {
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    __slice = [].slice;

  Workflow.table = (function(_super) {

    __extends(table, _super);

    table.include(BasicWorkflow);

    table.include(WorkflowSimpleStates);

    table.prototype.elements = {
      '> .dv-value > table > tbody': 'el_body',
      '> .dv-value': 'el_value',
      '> .dv-edit': 'el_edit',
      '[data-action=load-all]': 'el_load_all',
      '.dv-table-no-more': 'el_no_more'
    };

    table.prototype.events = {
      'click [data-sort-key]': 'on_click_table_heading',
      'click [data-action=load-all]': 'load_all'
    };

    function table(opts) {
      this.on_edit_state = __bind(this.on_edit_state, this);

      this.edit = __bind(this.edit, this);

      this.on_read_state = __bind(this.on_read_state, this);

      this.read = __bind(this.read, this);

      this.update_rows = __bind(this.update_rows, this);

      this.refresh_rows = __bind(this.refresh_rows, this);

      this.sort_rows = __bind(this.sort_rows, this);

      this.add_new_rows = __bind(this.add_new_rows, this);

      this.remove_missing_rows = __bind(this.remove_missing_rows, this);

      this.build_rows = __bind(this.build_rows, this);

      this.create_row = __bind(this.create_row, this);

      this.instance_changed = __bind(this.instance_changed, this);

      this.replace_records = __bind(this.replace_records, this);

      this.handle_error = __bind(this.handle_error, this);

      this.run_queries = __bind(this.run_queries, this);

      this.load_all = __bind(this.load_all, this);

      this.show_no_more = __bind(this.show_no_more, this);

      this.show_load_all = __bind(this.show_load_all, this);

      this.load_rel = __bind(this.load_rel, this);

      this.on_click_table_heading = __bind(this.on_click_table_heading, this);

      this.dust_context = __bind(this.dust_context, this);

      var _this = this;
      table.__super__.constructor.call(this, opts);
      this.read_config_from_el();
      this.states(["Read", "Edit", "Create Controls"]);
      this.on_enter('Read', this.on_read_state);
      this.on_enter('Edit', this.on_edit_state);
      this.on_change('instance', this.instance_changed);
      this.on_change('sort_by', this.sort_rows);
      this.attr_accessor('instance', this);
      this.dust_template('workflow/type/table');
      this.attr('dust_context', this.dust_context);
      this.attr('dust_replace', true);
      this.render();
      this.attr('instance', this.attr('parent').instance());
      this.hide_if_empty();
      this.release(function() {
        var _ref;
        return (_ref = _this.attr('rows')) != null ? _ref.map(function(c) {
          return c.release();
        }) : void 0;
      });
    }

    table.prototype.read_config_from_el = function() {
      var a, attrs, c, cols, el, name, options, queries, query_map, sort_by;
      this.attr('name', this.el.attr('name'));
      this.attr('label', this.el.attr('label'));
      attrs = this.el[0].attributes;
      options = this.$('options');
      this.attr('delete?', options.attr('delete') != null);
      this.attr('create?', options.attr('create') != null);
      this.attr('header?', !(options.attr('no-header') != null));
      this.attr('hide_empty?', options.attr('hide-empty') != null);
      this.attr('noedit?', options.attr('no-edit') != null);
      sort_by = options.attr('sort');
      this.attr('sort_by', sort_by);
      query_map = {};
      queries = (function() {
        var _i, _len, _ref, _ref1, _ref2, _ref3, _ref4, _ref5, _results;
        _ref = this.el.find('query');
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          el = _ref[_i];
          a = el.attributes;
          name = (_ref1 = a.name) != null ? _ref1.value : void 0;
          _results.push(query_map[name] = {
            name: name,
            as_rel: (_ref2 = a.as_rel) != null ? _ref2.value : void 0,
            parts: (_ref3 = a.parts) != null ? _ref3.value : void 0,
            query: (_ref4 = a.query) != null ? _ref4.value : void 0,
            path_properties: (_ref5 = a.path_properties) != null ? _ref5.value : void 0
          });
        }
        return _results;
      }).call(this);
      if (queries.length > 0) {
        this.attr('queries', queries);
      }
      cols = (function() {
        var _i, _len, _ref, _ref1, _ref2, _ref3, _ref4, _ref5, _ref6, _results;
        _ref = this.el.find('column');
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          el = _ref[_i];
          a = el.attributes;
          c = {
            type: (_ref1 = a.type) != null ? _ref1.value : void 0,
            key: (_ref2 = a.key) != null ? _ref2.value : void 0,
            part: (_ref3 = a.part) != null ? _ref3.value : void 0,
            result_part: (_ref4 = a.result_part) != null ? _ref4.value : void 0,
            query: query_map[(_ref5 = a.query) != null ? _ref5.value : void 0],
            label: el.textContent,
            size: (_ref6 = a.size) != null ? _ref6.value : void 0
          };
          c.sortable = this.sortable(c);
          _results.push(c);
        }
        return _results;
      }).call(this);
      return this.attr('columns', cols);
    };

    table.prototype.sortable = function(col) {
      switch (col.type) {
        case 'one_rel':
        case 'many_rel':
        case 'query':
          return false;
        default:
          return true;
      }
    };

    table.prototype.dust_context = function() {
      return TemplateHelpers.make().push({
        name: this.attr('name'),
        label: this.attr('label'),
        columns: this.attr('columns'),
        "delete": this.attr('delete?'),
        create: this.attr('create?'),
        noedit: this.attr('noedit?'),
        header: this.attr('header?')
      });
    };

    table.prototype.has_rels = function() {
      return _.some(this.attr('columns'), function(c) {
        return c.type === 'one_rel' || c.type === 'many_rel';
      });
    };

    table.prototype.rel_resource = function() {
      return this.attr('instance').rel(this.attr('name'));
    };

    table.prototype.on_click_table_heading = function(e) {
      return this.attr('sort_by', e.target.dataset.sortKey);
    };

    table.prototype.load_rel = function(records) {
      if (this.has_rels() && !this.new_instance()) {
        this.rel_resource().search(this.record_ids(records)).all().then(this.replace_records).then(this.update_rows, this.handle_error);
      }
      return records;
    };

    table.prototype.show_load_all = function(records) {
      var meta;
      meta = this.attr('instance').meta_info();
      if (meta) {
        if (records.length === meta.rel_limit) {
          this.el_load_all.show();
        } else if (records.length > meta.rel_limit / 2) {
          this.el_load_all.hide();
          this.el_no_more.show();
        }
      }
      return records;
    };

    table.prototype.show_no_more = function(records) {
      this.el_no_more.show();
      return records;
    };

    table.prototype.new_instance = function() {
      return this.attr('instance').is_new();
    };

    table.prototype.load_all = function() {
      var _this = this;
      if (!this.new_instance()) {
        return this.rel_resource().set_limit(1000).all().then(this.show_no_more).then(this.replace_records).then(this.run_queries).then(this.update_rows, this.handle_error).then(function() {
          return _this.el_load_all.hide();
        });
      }
    };

    table.prototype.record_ids = function(records) {
      return _.map(records, function(r) {
        return r.id();
      });
    };

    table.prototype.run_queries = function(records) {
      var empty,
        _this = this;
      empty = !records || records.length === 0;
      _.forEach(this.attr('queries'), function(q) {
        var ids, p, r;
        if (q.parts && q.path_properties) {
          if (!empty) {
            p = kew.defer();
            ids = _this.record_ids(records).join();
            Xn.data.get("/is/" + q.parts + "/ids/" + ids + "/" + q.query + "/path_properties/" + q.path_properties, p.makeNodeResolver());
            q.promise = p.then(_this.on_path_properties(q, q.path_properties), _this.handle_error);
            return q.promise.then(function(result) {
              return _this.refresh_rows();
            });
          }
        } else if (q.query) {
          if (!empty) {
            if (q.parts) {
              r = Xn.is(q.parts.split(','));
            } else {
              r = _this.rel_resource().type();
            }
            r = r.search(_this.record_ids(records));
            r = r.resource(q.query);
            r = r.paths();
            _.forEach(records, function(r) {
              return r.many_rel(q.as_rel, []);
            });
            return r.all().then(_this.on_query_rels(q), _this.handle_error);
          }
        } else if (q.parts) {
          if (!_this.new_instance()) {
            r = _this.rel_resource().is(q.parts.split(','));
            p = r.all();
            return q.promise = p.fail(_this.handle_error).then(_this.update_rows);
          }
        }
      });
      return records;
    };

    table.prototype.handle_error = function(err) {
      if (err === 'Unauthorized') {
        return kew.resolve([]);
      } else {
        return main.error(err);
      }
    };

    table.prototype.on_path_properties = function(query, str) {
      var group, names,
        _this = this;
      names = (function() {
        var _i, _len, _ref, _results;
        _ref = str.split(/\//);
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          group = _ref[_i];
          _results.push(group.split(/,/));
        }
        return _results;
      })();
      return function(result) {
        var entry, mapped, name, name_group, record, value, value_group, _i, _j, _k, _len, _len1, _len2, _ref, _ref1, _ref2, _ref3;
        mapped = {};
        for (_i = 0, _len = result.length; _i < _len; _i++) {
          record = result[_i];
          entry = {
            meta: {}
          };
          if (names && record) {
            _ref = _.zip(names, record);
            for (_j = 0, _len1 = _ref.length; _j < _len1; _j++) {
              _ref1 = _ref[_j], name_group = _ref1[0], value_group = _ref1[1];
              if (name_group && value_group) {
                _ref2 = _.zip(name_group, value_group);
                for (_k = 0, _len2 = _ref2.length; _k < _len2; _k++) {
                  _ref3 = _ref2[_k], name = _ref3[0], value = _ref3[1];
                  if (name === 'xnid') {
                    mapped[value] = entry;
                    entry['meta'] = {
                      'xnid': value
                    };
                  }
                  entry[name] = value;
                }
              }
            }
          }
        }
        return mapped;
      };
    };

    table.prototype.on_query_rels = function(query) {
      var records,
        _this = this;
      records = this.record_map();
      return function(paths) {
        return _.forEach(paths, function(_arg) {
          var from, path, record;
          from = _arg[0], path = 2 <= _arg.length ? __slice.call(_arg, 1) : [];
          record = records[from.xnid()];
          if (record) {
            return record.many_rel(query.as_rel, {
              add: _.last(path)
            });
          }
        });
      };
    };

    table.prototype.replace_records = function(records) {
      if (this._records && !this._records.isComplete()) {
        this._records.resolve(records);
      } else {
        this._records = kew.resolve(records);
      }
      return records;
    };

    table.prototype.records = function() {
      var p;
      if (this._records) {
        return this._records;
      } else {
        p = kew.defer();
        this.attr('instance').many_rel(this.attr('name'), p.makeNodeResolver());
        return this._records = p.fail(this.handle_error).then(this.show_load_all).then(this.load_rel);
      }
    };

    table.prototype.instance_changed = function(w, inst) {
      this._records = null;
      return this.records().then(this.run_queries, this.handle_error).then(this.build_rows);
    };

    table.prototype.record_map = function() {
      var _this = this;
      return this.records().whenResolved(function(records) {
        return _.reduce(records, (function(m, r) {
          m[r.xnid()] = r;
          return m;
        }), {});
      });
    };

    table.prototype.row_map = function() {
      return _.reduce(this.attr('rows'), (function(m, r) {
        m[r.record.xnid()] = r;
        return m;
      }), {});
    };

    table.prototype.create_row = function(record) {
      return new Workflow.table.TableRow({
        table: this,
        record: record
      }).render().read();
    };

    table.prototype.build_rows = function(records) {
      var rows;
      rows = records.map(this.create_row);
      this.attr('rows', rows);
      this.sort_rows();
      this.hide_if_empty();
      return rows;
    };

    table.prototype.remove_missing_rows = function() {
      var exists, records, row, _i, _len, _ref;
      records = this.record_map();
      if (records) {
        exists = function(row) {
          return records[row.xnid()];
        };
        _ref = _.reject(this.attr('rows'), exists);
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          row = _ref[_i];
          row.release();
        }
        return this.attr('rows', _.filter(this.attr('rows'), exists));
      }
    };

    table.prototype.add_new_rows = function() {
      var exists, row_map,
        _this = this;
      row_map = this.row_map();
      exists = function(r) {
        return row_map[r.xnid()];
      };
      return this.records().whenResolved(function(records) {
        var new_rows;
        new_rows = _.reject(records, exists).map(_this.create_row);
        return _this.attr('rows', _.union(_this.attr('rows'), new_rows));
      });
    };

    table.prototype.sort_rows = function() {
      var rows,
        _this = this;
      rows = this.attr('rows');
      rows.sort(function(a, b) {
        return xn.support.natural_sort(a.sort_by(), b.sort_by());
      });
      return _.each(rows, function(r) {
        return _this.el_body.append(r.el);
      });
    };

    table.prototype.hide_if_empty = function() {
      if (this.attr('rows')) {
        if (this.attr('rows').length === 0 && this.attr('hide_empty?')) {
          return this.el.hide();
        } else {
          return this.el.css('display', '');
        }
      } else {
        return this.el.hide();
      }
    };

    table.prototype.refresh_rows = function() {
      return _.each(this.attr('rows'), function(row) {
        return row.refresh();
      });
    };

    table.prototype.update_rows = function() {
      this.remove_missing_rows();
      this.refresh_rows();
      this.add_new_rows();
      this.sort_rows();
      return this.hide_if_empty();
    };

    table.prototype.rel_controller = function() {
      var meta, _ref,
        _this = this;
      if (this._rel_controller) {
        return this._rel_controller;
      } else {
        meta = function() {
          var _ref;
          return (_ref = _this.attr('parent').metadata()) != null ? _ref.relationships[_this.attr('name')] : void 0;
        };
        if (meta()) {
          if ((_ref = this._rel_controller) == null) {
            this._rel_controller = new Workflow.Rel.many({
              el: this.el_edit,
              name: this.attr('name'),
              meta: meta,
              parent: this.attr('parent')
            });
          }
          return this._rel_controller.edit();
        }
      }
    };

    table.prototype.read = function() {
      return this.state('Read');
    };

    table.prototype.on_read_state = function(x, y, prev_state) {
      var row, _i, _len, _ref;
      this.hide_if_empty();
      this.el_edit.hide();
      if (this.attr('rows')) {
        _ref = this.attr('rows');
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          row = _ref[_i];
          row.read();
        }
      }
      if (prev_state === 'Edit') {
        this._records = null;
        this.update_rows();
      }
      return this.el_value.show();
    };

    table.prototype.edit = function() {
      return this.state('Edit');
    };

    table.prototype.on_edit_state = function() {
      var _ref;
      if (this.attr('noedit?')) {
        return this.el.hide();
      } else {
        this.el.show();
        this.el_value.hide();
        this.el_edit.show();
        return (_ref = this.rel_controller()) != null ? _ref.edit() : void 0;
      }
    };

    return table;

  })(BaseController);

}).call(this);
}, "fe/controllers/workflow/table_row": function(exports, require, module) {(function() {
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Workflow.table.TableRow = (function(_super) {

    __extends(TableRow, _super);

    TableRow.include(BasicWorkflow);

    TableRow.include(WorkflowSimpleStates);

    TableRow.prototype.tag = 'tr';

    TableRow.prototype.className = 'dv-row';

    function TableRow() {
      this.create_control = __bind(this.create_control, this);

      this.create_controls = __bind(this.create_controls, this);

      var _this = this;
      TableRow.__super__.constructor.apply(this, arguments);
      this.states(["Read", "Edit", "Create Controls"]);
      this.dust_template('workflow/type/table_row');
      this.attr('dust_context', function() {
        return {
          columns: _this.attr('table').attr('columns')
        };
      });
      this.on_render(this.create_controls);
      this.release(function() {
        var _ref;
        return (_ref = _this.attr('controls')) != null ? _ref.map(function(c) {
          return c.release();
        }) : void 0;
      });
    }

    TableRow.prototype.xnid = function() {
      return this.attr('record').xnid();
    };

    TableRow.prototype.sort_by = function() {
      return this.attr('record').attr(this.attr('table').attr('sort_by'));
    };

    TableRow.prototype.read = function() {
      var c, _i, _len, _ref;
      this.state('Read');
      _ref = this.attr('controls');
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        c = _ref[_i];
        c.read();
      }
      return this;
    };

    TableRow.prototype.edit = function() {
      var c, _i, _len, _ref;
      this.state('Edit');
      _ref = this.attr('controls');
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        c = _ref[_i];
        c.edit();
      }
      return this;
    };

    TableRow.prototype.refresh = function() {
      if (this.state() === 'Read') {
        _.each(this.attr('controls'), function(c) {
          return c.onreading();
        });
      }
      return this;
    };

    TableRow.prototype.control_cells = function() {
      return $(this.el).children();
    };

    TableRow.prototype.create_controls = function() {
      var columns, controls;
      columns = this.attr('table').attr('columns');
      controls = _.zip(this.control_cells(), columns).map(this.create_control);
      return this.attr('controls', controls);
    };

    TableRow.prototype.create_control = function(_arg) {
      var c, col, el_td, record, type;
      el_td = _arg[0], col = _arg[1];
      record = this.attr('record');
      type = this.control_type(col);
      c = new type(_.extend({
        el: el_td,
        name: col.key,
        instance: (function() {
          return record;
        }),
        parent: this
      }, this.control_opts(record, col)));
      c.load();
      return c;
    };

    TableRow.prototype.control_opts = function(record, col) {
      var _this = this;
      switch (col.type) {
        case "record":
          return {
            meta: function() {
              var e, md, _ref, _ref1;
              _ref1 = (_ref = record.model()) != null ? _ref.metadata() : void 0, e = _ref1[0], md = _ref1[1];
              return md;
            },
            size: col.size || 'inline'
          };
        case "one_rel":
        case "many_rel":
          return {
            meta: function() {
              var e, md, _ref, _ref1;
              _ref1 = (_ref = record.model()) != null ? _ref.metadata() : void 0, e = _ref1[0], md = _ref1[1];
              if (md) {
                return md.relationships[col.key];
              }
            },
            size: col.size || 'inline'
          };
        case "query":
          return {
            meta: function() {
              return {
                read_only: true
              };
            },
            instance: function() {
              var data, p;
              p = col.query.promise;
              data = p.isResolved() ? p.deref() : {};
              return new xn.instance.Record(Xn, data[record.xnid()] || {});
            }
          };
        default:
          return {
            meta: function() {
              var m, _ref, _ref1, _ref2;
              m = (_ref = record.model()) != null ? _ref.metadata() : void 0;
              if (m && m[1]) {
                return ((_ref1 = m[1].properties) != null ? _ref1[col.key] : void 0) || ((_ref2 = m[1].displays) != null ? _ref2[col.key] : void 0) || {};
              } else {
                return {};
              }
            }
          };
      }
    };

    TableRow.prototype.control_type = function(col) {
      var control;
      return control = (function() {
        switch (col.type) {
          case "record":
            return Workflow.Rel.record;
          case "one_rel":
            return Workflow.Rel.one;
          case "many_rel":
            return Workflow.Rel.many;
          case "query":
            return Workflow.Rel.record;
          default:
            if (Workflow[col.type]) {
              return Workflow[col.type];
            } else {
              return Workflow.text;
            }
        }
      })();
    };

    return TableRow;

  })(BaseController);

}).call(this);
}, "fe/controllers/workflow/text": function(exports, require, module) {(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  Workflow.display = (function(_super) {

    __extends(display, _super);

    function display() {
      return display.__super__.constructor.apply(this, arguments);
    }

    return display;

  })(Workflow.Type);

  Workflow.text = (function(_super) {

    __extends(text, _super);

    function text() {
      return text.__super__.constructor.apply(this, arguments);
    }

    text.prototype.edit_template = 'workflow/type/text';

    text.prototype.events = {
      'change input': '_change'
    };

    return text;

  })(Workflow.Type);

  Workflow.password = (function(_super) {

    __extends(password, _super);

    function password() {
      return password.__super__.constructor.apply(this, arguments);
    }

    password.prototype.edit_template = 'workflow/type/password';

    return password;

  })(Workflow.text);

  Workflow.ipv4 = (function(_super) {

    __extends(ipv4, _super);

    function ipv4() {
      return ipv4.__super__.constructor.apply(this, arguments);
    }

    ipv4.prototype.edit_template = 'workflow/type/text';

    return ipv4;

  })(Workflow.text);

  Workflow.date = (function(_super) {

    __extends(date, _super);

    function date() {
      this.value = __bind(this.value, this);
      return date.__super__.constructor.apply(this, arguments);
    }

    date.prototype.edit_template = 'workflow/type/date';

    date.prototype.value = function() {
      var v;
      v = date.__super__.value.apply(this, arguments);
      try {
        return _.fromUTC(Date.parse(v));
      } catch (e) {
        return v;
      }
    };

    return date;

  })(Workflow.text);

  Workflow.date_time = Workflow.date;

  Workflow.numeric = (function(_super) {

    __extends(numeric, _super);

    function numeric() {
      return numeric.__super__.constructor.apply(this, arguments);
    }

    numeric.prototype.edit_template = 'workflow/type/numeric';

    return numeric;

  })(Workflow.text);

  Workflow.number = (function(_super) {

    __extends(number, _super);

    function number() {
      return number.__super__.constructor.apply(this, arguments);
    }

    number.prototype.edit_template = 'workflow/type/number';

    return number;

  })(Workflow.text);

  Workflow.textarea = (function(_super) {

    __extends(textarea, _super);

    function textarea() {
      return textarea.__super__.constructor.apply(this, arguments);
    }

    textarea.prototype.edit_template = 'workflow/type/textarea';

    textarea.prototype.elements = function() {
      return textarea.__super__.elements.call(this, {
        'textarea': 'el_input'
      });
    };

    textarea.prototype.events = {
      'change textarea': '_change'
    };

    return textarea;

  })(Workflow.text);

  Workflow.object = (function(_super) {

    __extends(object, _super);

    function object() {
      this.value = __bind(this.value, this);
      return object.__super__.constructor.apply(this, arguments);
    }

    object.prototype.value = function() {
      var val;
      val = object.__super__.value.apply(this, arguments);
      if (val) {
        return JSON.stringify(object.__super__.value.apply(this, arguments), null, 4);
      } else {
        return val;
      }
    };

    object.prototype.onreading = function() {
      var e, pre;
      e = this.el_value;
      try {
        if (this.value()) {
          pre = $('<pre></pre>');
          this.el_value.html(pre);
          this.el_value = pre;
        }
        return object.__super__.onreading.apply(this, arguments);
      } finally {
        this.el_value = e;
      }
    };

    return object;

  })(Workflow.text);

  Workflow.boolean = (function(_super) {

    __extends(boolean, _super);

    function boolean() {
      this._change = __bind(this._change, this);
      return boolean.__super__.constructor.apply(this, arguments);
    }

    boolean.prototype.edit_template = 'workflow/type/boolean';

    boolean.prototype.events = {
      'click input': '_change'
    };

    boolean.prototype._change = function() {
      var _ref;
      if ((_ref = this.instance()) != null) {
        _ref.attr(this.name, this.el_input[0].checked);
      }
      return true;
    };

    boolean.prototype.edit_context = function() {
      if (this.value()) {
        return boolean.__super__.edit_context.call(this, {
          checked: 'checked'
        });
      } else {
        return boolean.__super__.edit_context.apply(this, arguments);
      }
    };

    return boolean;

  })(Workflow.Type);

  Workflow.select = (function(_super) {

    __extends(select, _super);

    function select() {
      return select.__super__.constructor.apply(this, arguments);
    }

    select.prototype.edit_template = 'workflow/type/select';

    select.prototype.events = {
      'change select': '_change'
    };

    select.prototype.elements = function() {
      return select.__super__.elements.call(this, {
        'select': 'el_input'
      });
    };

    select.prototype.edit_context = function() {
      var option, options, value, _i, _len, _ref;
      value = this.value();
      options = [];
      _ref = this.metadata().options;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        option = _ref[_i];
        options.push({
          value: option,
          selected: option === value
        });
      }
      return select.__super__.edit_context.call(this, {
        options: options,
        blank: this.metadata().validations.allow_blank
      });
    };

    return select;

  })(Workflow.Type);

  Workflow.Button = (function(_super) {

    __extends(Button, _super);

    function Button() {
      this._click = __bind(this._click, this);
      return Button.__super__.constructor.apply(this, arguments);
    }

    Button.prototype.edit_template = 'workflow/type/button';

    Button.prototype.events = {
      'click button': '_click'
    };

    Button.prototype._click = function() {
      return this.parent.event(this.el.data('event'));
    };

    Button.prototype.metadata = function() {
      return {};
    };

    Button.prototype.edit_context = function(more) {
      var context;
      context = {
        label: this.el.data('text')
      };
      if (more) {
        return $.extend({}, context, more);
      } else {
        return context;
      }
    };

    return Button;

  })(Workflow.Type);

  Workflow.Select = (function(_super) {

    __extends(Select, _super);

    Select.prototype.edit_template = 'workflow/type/select';

    function Select() {
      this._select = __bind(this._select, this);

      var _this = this;
      Select.__super__.constructor.apply(this, arguments);
      this.opts_key = this.el.data('options');
      this.parent.on_change(this.opts_key, function() {
        if (_this.rendered) {
          return _this.render_edit;
        }
      });
    }

    Select.prototype.events = {
      'change select': '_select'
    };

    Select.prototype.metadata = function() {
      return {};
    };

    Select.prototype.edit_context = function() {
      var options, opts, value, _i, _len, _ref;
      options = [];
      this.rendered = true;
      opts = (_ref = this.parent.attr(this.opts_key)) != null ? _ref : [];
      for (_i = 0, _len = opts.length; _i < _len; _i++) {
        value = opts[_i];
        options.push({
          value: value,
          text: dust.filters.capitalize(value)
        });
      }
      return {
        options: options,
        blank: this.el.data('allow_blank')
      };
    };

    Select.prototype._select = function(e) {
      return this.parent.event(this.el.data('on_select'), this.el_input.val());
    };

    Select.prototype._change_options = function() {
      return this.render_edit();
    };

    return Select;

  })(Workflow.select);

}).call(this);
}, "fe/controllers/workflow/type": function(exports, require, module) {(function() {
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    __slice = [].slice;

  Workflow.Type = (function(_super) {

    __extends(Type, _super);

    Type.prototype.elements = function(more) {
      var elements;
      if (more == null) {
        more = {};
      }
      elements = {
        '.dv-value': 'el_value',
        '.dv-label': 'el_label',
        '.dv-edit': 'el_edit',
        'input': 'el_input'
      };
      return $.extend({}, elements, more);
    };

    function Type(options) {
      var _base,
        _this = this;
      if (options == null) {
        options = {};
      }
      this._change = __bind(this._change, this);

      this._release = __bind(this._release, this);

      this._release_instance = __bind(this._release_instance, this);

      this.instance_changed = __bind(this.instance_changed, this);

      this.value = __bind(this.value, this);

      Type.__super__.constructor.apply(this, arguments);
      this.fsm = StateMachine.create({
        initial: 'initial',
        target: this,
        error: function(n, from, to, args, code, message, exception) {
          if (exception) {
            throw exception;
          }
        },
        events: this.fsm_events
      });
      this.fsm.onstatechange = function() {
        var args;
        args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
        return console.log.apply(console, ['control state changed to'].concat(__slice.call(args)));
      };
      if (typeof (_base = this.parent).on_instance_change === "function") {
        _base.on_instance_change(this.instance_changed);
      }
      this.instance_changed();
      this.release(this._release_instance);
      this.release(this._release);
    }

    Type.prototype.fsm_events = [
      {
        name: 'load',
        from: 'initial',
        to: 'loaded'
      }, {
        name: 'edit',
        from: 'loaded',
        to: 'editing'
      }, {
        name: 'edit',
        from: 'reading',
        to: 'editing'
      }, {
        name: 'read',
        from: 'loaded',
        to: 'reading'
      }, {
        name: 'read',
        from: 'editing',
        to: 'reading'
      }, {
        name: 'readonly',
        from: 'editing',
        to: 'not_editing'
      }, {
        name: 'read',
        from: 'not_editing',
        to: 'reading'
      }
    ];

    Type.prototype.instance = function() {
      return this.parent.instance();
    };

    Type.prototype.metadata = function() {
      return this.options.meta(true);
    };

    Type.prototype.value = function() {
      var attr, _ref;
      attr = (_ref = this.instance()) != null ? _ref.attr(this.name) : void 0;
      if (attr != null) {
        return attr;
      } else {
        return this.metadata()["default"];
      }
    };

    Type.prototype.instance_changed = function() {
      if (this.instance()) {
        this._release_instance();
        return this.fsm.load();
      }
    };

    Type.prototype.onnot_editing = function() {
      return this.onreading();
    };

    Type.prototype.onreading = function() {
      var filter, value, _i, _len, _ref;
      this.el_edit.addClass('hide');
      this.editing = false;
      this.el_value.removeClass('hide');
      value = this.value();
      if (value) {
        _ref = this.filters;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          filter = _ref[_i];
          if (filter) {
            value = dust.filters[filter](value);
          }
        }
        if (this.unit) {
          value += this.unit;
        }
      }
      this.el_value.text(value || '');
      return this.el_value.html(dust.filters.linkify(this.el_value.text()));
    };

    Type.prototype.onleavereading = function() {
      return this.el_value.addClass('hide');
    };

    Type.prototype.onedit = function(name, from, to, base_ctx) {
      if (to === 'editing') {
        if (this.metadata().read_only || this.metadata().type === 'display' || this.metadata().type === 'object') {
          return this.readonly();
        }
        return this.render_edit(base_ctx);
      }
    };

    Type.prototype.render_edit = function(base_ctx) {
      var _this = this;
      if (base_ctx == null) {
        base_ctx = this.attr('dust_base');
      }
      if (this.edit_template) {
        this.editing = true;
        this.el_edit.removeClass('hide');
        dust.render(this.edit_template, base_ctx.push(this.edit_context()), function(err, html) {
          _this.el_edit.html(html);
          return _this.refreshElements();
        });
      } else {
        this.readonly();
      }
      if (this._fires_initial_change()) {
        return this.el_input.change();
      }
    };

    Type.prototype.onloaded = function() {
      var _ref;
      if ((_ref = this.name) == null) {
        this.name = this.el.data('property');
      }
      this.filters = (this.el.data('filter') || '').split('|');
      this.unit = this.el.data('unit') || this.metadata().unit;
      return this.placeholder = this.el.data('placeholder');
    };

    Type.prototype._fires_initial_change = function() {
      if (this.el.data('fire_initial_change') !== void 0) {
        return Boolean(this.el.data('fire_initial_change'));
      } else {
        return true;
      }
    };

    Type.prototype.label = function() {
      return this.el_label.text();
    };

    Type.prototype._release_instance = function() {};

    Type.prototype._release = function() {};

    Type.prototype.edit_context = function(more) {
      var context, _ref, _ref1, _ref2;
      context = {
        value: this.value(),
        min: (_ref = this.metadata().validations) != null ? _ref.min : void 0,
        max: (_ref1 = this.metadata().validations) != null ? _ref1.max : void 0,
        limit_to_list: (_ref2 = this.metadata().validations) != null ? _ref2.limit_to_list : void 0,
        unit: this.unit,
        placeholder: this.placeholder
      };
      if (more) {
        return $.extend({}, context, more);
      } else {
        return context;
      }
    };

    Type.prototype._change = function() {
      var _ref;
      return (_ref = this.instance()) != null ? _ref.attr(this.name, this.el_input.val()) : void 0;
    };

    return Type;

  })(BaseController);

}).call(this);
}, "fe/ipam/attach_subnets": function(exports, require, module) {(function() {
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  window.AttachSubnets = (function(_super) {

    __extends(AttachSubnets, _super);

    AttachSubnets.states = [
      {
        name: 'attach',
        from: ['Initial', 'Hidden'],
        to: 'Attach'
      }, {
        name: 'cancel',
        from: 'Attach',
        to: 'Hidden'
      }, {
        name: 'save',
        from: 'Attach',
        to: 'Saving'
      }, {
        name: 'saved',
        from: ['Deleting', 'Saving'],
        to: 'Hidden'
      }, {
        name: 'not_saved',
        from: ['Deleting', 'Saving'],
        to: 'Attach'
      }
    ];

    AttachSubnets.include(BasicWorkflow);

    AttachSubnets.include(WorkflowStateMachine);

    function AttachSubnets() {
      this.click_orphan = __bind(this.click_orphan, this);

      this.render_trees = __bind(this.render_trees, this);

      this.got_zones = __bind(this.got_zones, this);

      this.got_orphans = __bind(this.got_orphans, this);

      this.get_orphans = __bind(this.get_orphans, this);

      this.reset_pagination = __bind(this.reset_pagination, this);

      this.expand_tree = __bind(this.expand_tree, this);

      this.shrink_tree = __bind(this.shrink_tree, this);

      this.cancel = __bind(this.cancel, this);

      this.save = __bind(this.save, this);

      this.dust_context = __bind(this.dust_context, this);
      AttachSubnets.__super__.constructor.call(this);
      this._init_workflow();
      this.states(AttachSubnets.states);
      this.dust_template('ipam/attach');
      this.attr('dust_context', this.dust_context);
      this.attr('dust_replace', true);
      this.attr('changes', 0);
      this.attr('changed', {});
      this.on_change('subnet', this.reset_pagination);
      this.on_change('subnet', this.get_orphans);
      this.on_change('limit', this.get_orphans);
      this.on_change('offset', this.get_orphans);
      this.on_enter('Attach', this.shrink_tree);
      this.on_enter('Hidden', this.expand_tree);
      this.on_enter('Hidden', this.clear);
      this.on_after('save', this.save);
      this.on_before('cancel', this.cancel);
      this.on_change('orphans', this.render);
      this.on_render(this.render_trees);
    }

    AttachSubnets.prototype.dust_context = function() {
      return TemplateHelpers.make().push({
        orphans: this.attr('orphans')
      });
    };

    AttachSubnets.prototype.save = function() {
      var id, inst, _ref;
      _ref = this.attr('changed');
      for (id in _ref) {
        inst = _ref[id];
        inst.save();
      }
      this.attr('changed', {});
      this.attr('changes', 0);
      return this.event('saved');
    };

    AttachSubnets.prototype.cancel = function() {
      var id, inst, _ref;
      lm.Subnet6.clear_cache();
      _ref = this.attr('changed');
      for (id in _ref) {
        inst = _ref[id];
        inst.reload();
      }
      this.attr('changed', {});
      return this.attr('changes', 0);
    };

    AttachSubnets.prototype.shrink_tree = function() {
      return this.attr('tree').width(400).render();
    };

    AttachSubnets.prototype.expand_tree = function() {
      return this.attr('tree').width(null).render();
    };

    AttachSubnets.prototype.reset_pagination = function() {
      this.attr('limit', 10, false);
      return this.attr('offset', 0, false);
    };

    AttachSubnets.prototype.get_orphans = function(w, subnet) {
      var inst;
      if (subnet) {
        inst = subnet.subnet;
        if (this.attr('limit_to_zone')) {
          return this.paginate(inst.traversal("orphaned_subnets_in_zone")).all(this.got_orphans);
        } else {
          return this.paginate(inst.traversal("orphaned_subnets")).all(this.got_orphans);
        }
      } else {
        return this.got_orphans(null, []);
      }
    };

    AttachSubnets.prototype.paginate = function(route) {
      route.limit = this.attr('limit');
      route.offset = this.attr('offset');
      return route;
    };

    AttachSubnets.prototype.got_orphans = function(err, instances) {
      var inst, orphan, orphan_map, orphans, subnet, _i, _len;
      if (err) {
        instances = [];
        main.bad_news("Could not get orphaned subnets", err).render();
      }
      orphans = [];
      orphan_map = {};
      subnet = this.attr('subnet');
      for (_i = 0, _len = instances.length; _i < _len; _i++) {
        inst = instances[_i];
        orphan = {
          instance: inst,
          xnid: inst.xnid(),
          network_address: inst.attr('network_address'),
          direction: inst.attr('direction'),
          name: inst.attr('name'),
          subnet: new lm.OrphanSubnet(subnet, new lm.Subnet6(inst)),
          zones: []
        };
        orphans.push(orphan);
        orphan_map[inst.xnid()] = orphan;
      }
      this.attr('orphans', orphans);
      this.attr('orphan_map', orphan_map);
      if (orphans.length) {
        return this.get_zones(instances);
      } else {
        this.render();
        return main.good_news("Nothing to see here", "There are no orphaned subnets under this subnet.").add_button('back', "Go Back", {
          close: true,
          back: true
        }).add_button('cancel_timeout', "Wait", {
          "class": 'notice'
        }).last_for(5, 'back').render();
      }
    };

    AttachSubnets.prototype.get_zones = function(instances) {
      var ids, inst;
      if (instances.length === 0) {
        return this.got_zones(null, []);
      } else {
        ids = (function() {
          var _i, _len, _results;
          _results = [];
          for (_i = 0, _len = instances.length; _i < _len; _i++) {
            inst = instances[_i];
            _results.push(inst.id());
          }
          return _results;
        })();
        return Xn.data.get("/is/subnet/" + (ids.join(",")) + "/rel/zones/path_properties/xnid/xnid,name", this.got_zones);
      }
    };

    AttachSubnets.prototype.got_zones = function(err, zones) {
      var orphan, orphan_map, subnet, xnid, zone, _i, _j, _len, _len1, _ref, _ref1, _ref2, _ref3, _results;
      if (err) {
        zones = [];
        main.bad_news("Could not get zones", err).render();
      }
      orphan_map = this.attr('orphan_map');
      for (_i = 0, _len = zones.length; _i < _len; _i++) {
        _ref = zones[_i], (_ref1 = _ref[0], subnet = _ref1[0]), (_ref2 = _ref[1], xnid = _ref2[0], zone = _ref2[1]);
        orphan_map[subnet].zones.push(zone);
      }
      _ref3 = this.attr('orphans');
      _results = [];
      for (_j = 0, _len1 = _ref3.length; _j < _len1; _j++) {
        orphan = _ref3[_j];
        _results.push(this.el.find("[data-subnet=\"" + orphan.xnid + "\"] .zones").text(orphan.zones.join(', ')));
      }
      return _results;
    };

    AttachSubnets.prototype.render_trees = function() {
      var orphan, orphans, tree, trees, _i, _len;
      orphans = this.attr('orphans');
      trees = this.attr('trees');
      if (trees != null) {
        for (_i = 0, _len = trees.length; _i < _len; _i++) {
          tree = trees[_i];
          tree.release();
        }
      }
      if (orphans != null) {
        trees = (function() {
          var _j, _len1, _results;
          _results = [];
          for (_j = 0, _len1 = orphans.length; _j < _len1; _j++) {
            orphan = orphans[_j];
            tree = new SubnetTree();
            tree.skip_levels = 1;
            tree.bar_height = 20;
            tree.text = false;
            tree.hover = true;
            tree.bind('click', this.click_orphan);
            tree.width(400);
            tree.subnet(orphan.subnet);
            tree.render();
            this.el.find("[data-subnet=\"" + orphan.xnid + "\"] .tree").append(tree.el);
            _results.push(tree);
          }
          return _results;
        }).call(this);
        return this.attr('trees', trees);
      }
    };

    AttachSubnets.prototype.click_orphan = function(subtree) {
      var instance, orphan, subnet,
        _this = this;
      orphan = this.attr('orphan_map')[subtree.xnid];
      subnet = this.attr('subnet');
      instance = this.attr('instance');
      return subnet.add_subnet(orphan.subnet.subnets()[0], function(err, added_to) {
        if (err) {
          window.err = err;
          return main.bad_news("Unable to add selected subnet", err.message).add_button('ok', 'Yeah...', {
            close: true
          }).last_for(5, 'ok').render();
        } else {
          orphan.added = true;
          added_to.subnet.many_rel('subnets', {
            add: orphan.instance
          });
          _this.attr('tree').rebuild_data().render();
          _this.attr('changed')[added_to.xnid] = added_to.subnet;
          return _this.attr('changes', _this.attr('changes') + 1);
        }
      });
    };

    return AttachSubnets;

  })(Spine.Controller);

}).call(this);
}, "fe/ipam/d3_controller": function(exports, require, module) {(function() {
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  window.D3Controller = (function(_super) {

    __extends(D3Controller, _super);

    function D3Controller() {
      this.d3_el = __bind(this.d3_el, this);

      this.svg = __bind(this.svg, this);
      return D3Controller.__super__.constructor.apply(this, arguments);
    }

    D3Controller.prototype.duration = 250;

    D3Controller.prototype.data_selector = function() {
      return this.data_tag + '.' + this.data_class;
    };

    D3Controller.prototype.container = 'svg';

    D3Controller.prototype.width = function() {};

    D3Controller.prototype.height = function() {};

    D3Controller.prototype.render = function() {
      return this.d3_render();
    };

    D3Controller.prototype.d3_render = function() {
      var doc, new_element;
      doc = this.document();
      new_element = doc.enter().append(this.data_tag).attr('class', this.data_class);
      this.enter(new_element);
      this.handlers(new_element);
      this.exit(doc.exit());
      this.update(doc);
      this.transition(this.t(doc));
      return this;
    };

    D3Controller.prototype.enter = function(doc) {};

    D3Controller.prototype.handlers = function(doc) {};

    D3Controller.prototype.update = function(doc) {};

    D3Controller.prototype.transition = function(doc) {};

    D3Controller.prototype.exit = function(doc) {
      return this.t(doc).style('opacity', 0).remove();
    };

    D3Controller.prototype.t = function(obj) {
      return obj.transition().duration(this.duration);
    };

    D3Controller.prototype.data = function() {
      return [];
    };

    D3Controller.prototype.document = function() {
      return this[this.container]().selectAll(this.data_selector()).data(this.data(), this.data_identity);
    };

    D3Controller.prototype.svg = function() {
      if (this._svg != null) {
        return this._svg;
      }
      this._svg = d3.select(this.el[0]).append('svg');
      if (this.width()) {
        this._svg.attr('width', this.width());
      }
      if (this.height()) {
        this._svg.attr('height', this.height());
      }
      return this._svg;
    };

    D3Controller.prototype.d3_el = function() {
      return d3.select(this.el[0]);
    };

    D3Controller.prototype.txt = function(name, min_width) {
      if (min_width == null) {
        min_width = 1;
      }
      return function(d) {
        var orig, txt;
        if (d.dx > Math.abs(min_width)) {
          orig = d[name] || '';
          txt = d[name] || '';
          if (!txt.substr) {
            txt = '';
          }
          if (min_width >= 0) {
            txt = txt.substr(0, d.dx / 7);
            if (txt.length < orig.length) {
              txt += '..';
            }
          } else {
            txt = txt.substr(txt.length - d.dx / 7, txt.length);
            if (txt.length < orig.length) {
              txt = '..' + txt;
            }
          }
          return txt;
        } else {
          return '';
        }
      };
    };

    return D3Controller;

  })(Spine.Controller);

}).call(this);
}, "fe/ipam/ipam": function(exports, require, module) {(function() {
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  window.IPAM = (function(_super) {

    __extends(IPAM, _super);

    IPAM.states = [
      {
        name: 'view',
        from: '*',
        to: 'View'
      }, {
        name: 'history',
        from: 'View',
        to: 'View'
      }, {
        name: 'save',
        from: ['Attach', 'Build', 'Edit'],
        to: 'View'
      }, {
        name: 'cancel',
        from: ['Attach', 'Build', 'Edit'],
        to: 'View'
      }, {
        name: 'build',
        from: ['Initial', 'View', 'IPs', 'Edit', 'Build'],
        to: 'Build'
      }, {
        name: 'attach',
        from: ['Initial', 'View', 'IPs', 'Attach'],
        to: 'Attach'
      }, {
        name: 'ips',
        from: ['Initial', 'View', 'IPs', 'Edit'],
        to: 'IPs'
      }, {
        name: 'edit',
        from: ['Initial', 'View', 'IPs'],
        to: 'Edit'
      }, {
        name: 'delete',
        from: 'Edit',
        to: 'Deleting'
      }, {
        name: 'not_deleted',
        from: 'Deleting',
        to: 'Edit'
      }, {
        name: 'deleted',
        from: 'Deleting',
        to: 'View'
      }, {
        name: 'creating',
        from: 'Build',
        to: 'Create'
      }, {
        name: 'create',
        from: 'Create',
        to: 'Creating'
      }, {
        name: 'created',
        from: 'Creating',
        to: 'View'
      }, {
        name: 'not_created',
        from: ['Creating', 'CreatingMore'],
        to: 'Create'
      }, {
        name: 'create_more',
        from: 'Create',
        to: 'CreatingMore'
      }, {
        name: 'created',
        from: 'CreatingMore',
        to: 'Build'
      }, {
        name: 'uncreate',
        from: 'Create',
        to: 'Build'
      }
    ];

    IPAM.title = function(wf) {
      return "" + (wf.attr('display_name')) + " - IPAM - LightMesh CMDB";
    };

    function IPAM() {
      this.update_url = __bind(this.update_url, this);

      this.click_tree = __bind(this.click_tree, this);

      this.subnet_changed = __bind(this.subnet_changed, this);

      this.new_model_shown = __bind(this.new_model_shown, this);

      this.new_model_not_saved = __bind(this.new_model_not_saved, this);

      this.model_not_saved = __bind(this.model_not_saved, this);

      this.new_model_saved = __bind(this.new_model_saved, this);

      this.model_saved = __bind(this.model_saved, this);

      this.created = __bind(this.created, this);

      this.uncreate = __bind(this.uncreate, this);

      this.create = __bind(this.create, this);

      this.calc_broadcast = __bind(this.calc_broadcast, this);

      this.on_added_subnet = __bind(this.on_added_subnet, this);

      this.hide_model = __bind(this.hide_model, this);

      this.attach_subnets = __bind(this.attach_subnets, this);

      this.new_model_controller = __bind(this.new_model_controller, this);

      this.model_controller = __bind(this.model_controller, this);

      this.instance_changed = __bind(this.instance_changed, this);
      IPAM.__super__.constructor.call(this);
      this.states(IPAM.states);
      this.attr('menu', IPAM.menu);
      this.attr('model_name', 'subnet');
      this.attr('page_type', 'IPAM');
      this.topbar(new WfTopbar());
      this.attr('display_name', Model.display_name);
      this.controller('scale', this.scale_controller());
      this.controller('tree', this.tree_controller());
      this.controller('model', this.model_controller(), false);
      this.controller("new_model", this.new_model_controller, false);
      this.controller('attach_subnets', new AttachSubnets().attr('tree', this.controller('tree')), false);
      this.on_enter(['View', 'Edit'], this.attaches('model'));
      this.on_leave(['View', 'Edit'], this.hide_model);
      this.on_enter('Edit', this.hides('tree'));
      this.on_leave('Edit', this.shows('tree'));
      this.on_enter('Build', this.shows('scale'));
      this.on_leave('Build', this.hides('scale'));
      this.on_leave('Build', this.calls('scale', 'clear_selection'));
      this.on_before('attach', this.attach_subnets);
      this.on_before('attach', this.cascades_to('attach_subnets'));
      this.on_enter('Attach', this.attaches('attach_subnets'));
      this.on_leave('Attach', this.detaches('attach_subnets'));
      this.on_enter('Create', this.attaches('new_model'));
      this.on_leave('Create', this.detaches('new_model'));
      this.on_before('create', this.create);
      this.on_before('create_more', this.create);
      this.on_before('uncreate', this.uncreate);
      this.on_before('created', this.created);
      this.on_before('edit', this.cascades_to('model'));
      this.on_before(['save', 'cancel', 'view', 'ips', 'build', 'deleted', 'not_deleted', 'history'], this.cascade_to_model);
      this.on_after('delete', Model.prototype["delete"]);
      this.on_change('instance', this.instance_changed);
      this.attr_accessor('subnet');
      this.on_subnet_change(this.subnet_changed);
      this.on_state_change(this.update_url);
      this.on_render(this.render_controllers);
      this.title(IPAM.title);
    }

    IPAM.prototype.instance_changed = function(wf, value) {
      var c, _base, _i, _len, _ref, _results;
      this.topbar().render();
      this.update_title();
      _ref = this.controllers;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        c = _ref[_i];
        _results.push(typeof (_base = c.controller).instance === "function" ? _base.instance(value) : void 0);
      }
      return _results;
    };

    IPAM.prototype.model_controller = function() {
      var m,
        _this = this;
      m = new Model().on_after('saved', this.model_saved).on_after('not_saved', this.model_not_saved);
      m.topbar = function() {
        return _this.topbar();
      };
      return m;
    };

    IPAM.prototype.new_model_controller = function() {
      var state, states;
      states = (function() {
        var _i, _len, _ref, _results;
        _ref = NewModel.states;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          state = _ref[_i];
          if (state.name === 'saved') {
            _results.push({
              name: 'saved',
              from: 'Saving',
              to: 'Edit'
            });
          } else {
            _results.push(state);
          }
        }
        return _results;
      })();
      return new NewModel('subnet').on_after('saved', this.new_model_saved).on_after('not_saved', this.new_model_not_saved).states(states);
    };

    IPAM.prototype.tree_controller = function(wf) {
      var tree,
        _this = this;
      tree = new SubnetTree();
      tree.bind('changed', function() {
        return _this.controller('scale').render(tree.tree, tree.s6);
      });
      tree.bind('click', this.click_tree);
      return tree.bind('added_subnet', this.on_added_subnet);
    };

    IPAM.prototype.scale_controller = function() {
      var scale,
        _this = this;
      scale = new SubnetScale();
      scale.bind('add', function(add_mask) {
        var tree;
        tree = _this.controller('tree');
        tree.rebuild_data(add_mask);
        return tree.render();
      });
      scale.el.hide();
      return scale;
    };

    IPAM.prototype.attach_subnets = function() {
      return this.controller('attach_subnets').attr('subnet', this.subnet(), true);
    };

    IPAM.prototype.hide_model = function(wf, e, from, to) {
      switch (to) {
        case 'View':
        case 'Edit':
        case 'Deleting':
          break;
        default:
          return this.detaches('model')(this);
      }
    };

    IPAM.prototype.cascade_to_model = function(wf, e, from, to) {
      var controller;
      if (from === 'Edit' || from === 'Create' || from === 'Deleting' || e === 'history') {
        controller = wf.controller('model');
      } else if (from === 'Attach') {
        controller = wf.controller('attach_subnets');
      }
      if (controller) {
        if (controller.cannot(e)) {
          e = 'cancel';
        }
        return controller.event(e);
      }
    };

    IPAM.prototype.on_added_subnet = function(s6) {
      this.attr('parent_instance', this.instance());
      this.calc_broadcast(s6);
      this.controller('new_model').instance(s6.subnet).render();
      this.attr('creating_s6', s6);
      this.attr('creating_s6_xnid', s6.xnid());
      return this.event('creating', s6);
    };

    IPAM.prototype.calc_broadcast = function(s6) {
      return console.log('s6.endAddress: ', s6._ip.endAddress().address, s6._ip.endAddress().v4inv6());
    };

    IPAM.prototype.create = function() {
      return this.controller('new_model').event('save');
    };

    IPAM.prototype.uncreate = function() {
      var xnid;
      xnid = this.attr('creating_s6').xnid();
      this.controller('tree').uncreate_subnet(xnid);
      return this.controller('new_model').event('cancel').instance(this.attr('parent_instance')).render();
    };

    IPAM.prototype.created = function() {
      var s6;
      s6 = this.attr('creating_s6');
      return this.controller('tree').created_subnet(this.attr('creating_s6_xnid'), s6);
    };

    IPAM.prototype.model_saved = function() {
      return this.instance_changed(this, this.attr('parent_instance'));
    };

    IPAM.prototype.new_model_saved = function() {
      var inst,
        _this = this;
      this.event('created');
      if (this.state() === 'View') {
        inst = this.controller('new_model').instance();
        return Spine.Route.navigate(inst.xnid());
      } else if (this.state() === 'Build') {
        inst = this.attr('parent_instance');
        return inst.refresh(function() {
          return _this.controller('model').instance(inst);
        });
      }
    };

    IPAM.prototype.model_not_saved = function() {
      if (this.state() === 'Creating') {
        console.log('Err: In Creating state using Model controller.');
      }
      return this.controller('model').event('cancel').instance(this.attr('parent_instance')).render();
    };

    IPAM.prototype.new_model_not_saved = function() {
      this.event('not_created');
      return this.controller('model').event('cancel').instance(this.attr('parent_instance')).render();
    };

    IPAM.prototype.new_model_shown = function() {
      return this.controller('new_model').render();
    };

    IPAM.prototype.subnet_changed = function(wf, value) {
      this.attr('s6', value);
      this._each_controller('subnet', value);
      return this.instance(value.subnet);
    };

    IPAM.prototype.click_tree = function(s) {
      if (this.state() === 'View') {
        return Spine.Route.navigate(s.xnid);
      } else if (this.state() === 'Build') {
        return Spine.Route.navigate(s.xnid + "/build");
      } else if (this.state() === 'Attach') {
        return Spine.Route.navigate(s.xnid + "/attach");
      } else {
        return console.log('do something with', s);
      }
    };

    IPAM.prototype.update_url = function(wf, e) {
      var base, url;
      base = this.instance().xnid();
      return url = (function() {
        switch (e.event) {
          case 'view':
          case 'cancel':
          case 'save':
          case 'edit':
          case 'build':
            return Spine.Route.navigate(base, false);
          case 'attach':
          case 'ips':
            return Spine.Route.navigate(base + '/' + e.event, false);
        }
      })();
    };

    IPAM.menu = function(wf) {
      return [
        {
          state: 'Attach',
          primary: {
            options: Workflow.save_cancel(wf)
          }
        }, {
          state: 'Build',
          primary: {
            options: [
              {
                event: 'cancel',
                label: 'Done'
              }
            ]
          }
        }, {
          state: 'Create',
          primary: {
            options: [
              {
                event: 'create',
                label: 'Save'
              }, {
                event: 'uncreate',
                label: 'Cancel'
              }
            ]
          },
          secondary: {
            options: [
              {
                event: 'create_more',
                label: 'Save & Build More'
              }
            ]
          }
        }, {
          state: 'Edit',
          primary: {
            options: Workflow.save_cancel(wf)
          },
          secondary: {
            options: [
              {
                event: 'delete',
                label: 'Delete'
              }
            ]
          }
        }, {
          state: 'IPs',
          primary: {
            options: [
              {
                event: 'build',
                label: 'Build Subnets'
              }, {
                event: 'attach',
                label: 'Attach Subnets'
              }, {
                event: 'view',
                label: 'Analyze IPs',
                "class": 'active'
              }, {
                event: 'edit',
                label: 'Edit'
              }
            ]
          }
        }, {
          state: 'View',
          primary: {
            options: [
              {
                event: 'build',
                label: 'Build Subnets'
              }, {
                event: 'attach',
                label: 'Attach Subnets'
              }, {
                event: 'ips',
                label: 'Analyze IPs'
              }, {
                event: 'history',
                label: 'History'
              }, {
                event: 'verify',
                label: 'Verify Data'
              }, {
                event: 'edit',
                label: 'Edit'
              }
            ]
          }
        }
      ];
    };

    return IPAM;

  })(Workflow);

}).call(this);
}, "fe/ipam/subnet_scale": function(exports, require, module) {(function() {
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  window.SubnetScale = (function(_super) {

    __extends(SubnetScale, _super);

    function SubnetScale() {
      this.leave_subnet = __bind(this.leave_subnet, this);

      this.over_subnet = __bind(this.over_subnet, this);

      this.add_subnet = __bind(this.add_subnet, this);
      return SubnetScale.__super__.constructor.apply(this, arguments);
    }

    SubnetScale.prototype.bar_height = 28;

    SubnetScale.prototype.width = function() {
      return $(document).width();
    };

    SubnetScale.prototype.space = 5;

    SubnetScale.prototype.height = function() {
      return 8 * this.bar_height + 7 * this.space;
    };

    SubnetScale.prototype.data_tag = 'div';

    SubnetScale.prototype.data_class = 'ipam-add';

    SubnetScale.prototype.className = 'ipam-add-container';

    SubnetScale.prototype.container = 'd3_el';

    SubnetScale.prototype.render = function(tree, s6, selected) {
      this.tree = tree;
      this.s6 = s6;
      this.selected = selected;
      if (this.tree && this.s6) {
        this.blanks = lm.Subnet6.blanks(this.tree);
        this.scale = this.s6.standard_scale();
        return SubnetScale.__super__.render.apply(this, arguments);
      }
    };

    SubnetScale.prototype.data = function() {
      var d, data, vm;
      vm = this;
      data = d3.range(this.s6.mask() + 1, lm.Subnet6.max_mask(this.s6.mask())).map(function(mask) {
        return {
          mask: mask,
          mask32: mask - 96,
          width: vm.scale(lm.Subnet6.width(mask)),
          className: vm.selected_class(mask)
        };
      });
      d = _.select(data, function(d) {
        return _.any(vm.blanks, function(b) {
          return b.width >= d.width && b.parent.width !== d.width;
        });
      });
      return d;
    };

    SubnetScale.prototype.data_identity = function(d) {
      return d.mask;
    };

    SubnetScale.prototype.selected_class = function(mask) {
      if (this.selected) {
        if (this.selected === mask) {
          return 'ipam-add-bar-selected';
        } else {
          return 'ipam-add-bar-not-selected';
        }
      } else {
        return '';
      }
    };

    SubnetScale.prototype.enter = function(mask) {
      var vm;
      vm = this;
      return mask.append('button').attr('class', 'btn ipam-add-text').text(function(d) {
        return "/" + d.mask32 + " ";
      }).attr('data-subnet', function(d) {
        return d.mask;
      }).append('div').attr('class', "ipam-add-bar").style('width', function(d) {
        return vm.width() * d.width + 'px';
      });
    };

    SubnetScale.prototype.update = function(mask) {
      return mask.select('.ipam-add-bar').attr('class', function(d) {
        return "ipam-add-bar " + d.className;
      });
    };

    SubnetScale.prototype.transition = function(mask) {
      var vm;
      vm = this;
      mask.select('.ipam-add-bar').style('width', function(d) {
        return vm.width() * d.width + 'px';
      });
      return mask.delay(this.duration * 2).style('opacity', 1);
    };

    SubnetScale.prototype.events = {
      'click button': 'add_subnet',
      'mouseenter button': 'over_subnet',
      'mouseleave button': 'leave_subnet'
    };

    SubnetScale.prototype._subnet_for_e = function(e) {
      return e.currentTarget.dataset.subnet * 1;
    };

    SubnetScale.prototype.add_subnet = function(e) {
      var selected;
      selected = this._subnet_for_e(e);
      if (this.clicked && this.selected === selected) {
        selected = void 0;
      } else {
        this.clicked = true;
      }
      this.render(this.tree, this.s6, selected);
      return this.trigger('add', selected);
    };

    SubnetScale.prototype.clear_selection = function() {
      this.render(this.tree, this.s6);
      return this.trigger('add');
    };

    SubnetScale.prototype.over_subnet = function(e) {
      return this.trigger('add', this._subnet_for_e(e));
    };

    SubnetScale.prototype.leave_subnet = function(e) {
      return this.trigger('add', this.selected);
    };

    return SubnetScale;

  })(D3Controller);

}).call(this);
}, "fe/ipam/subnet_tree": function(exports, require, module) {(function() {
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  window.SubnetTree = (function(_super) {

    __extends(SubnetTree, _super);

    function SubnetTree() {
      this.leave_subnet = __bind(this.leave_subnet, this);

      this.over_subnet = __bind(this.over_subnet, this);

      this.leave_available = __bind(this.leave_available, this);

      this.over_available = __bind(this.over_available, this);

      this.click_available = __bind(this.click_available, this);

      this.click_subnet = __bind(this.click_subnet, this);

      this.render = __bind(this.render, this);

      this.subnet = __bind(this.subnet, this);

      this.width = __bind(this.width, this);

      this.height = __bind(this.height, this);
      return SubnetTree.__super__.constructor.apply(this, arguments);
    }

    SubnetTree.prototype.events = {
      'mouseenter g[class~=available]': 'over_available',
      'mouseleave g[class~=available]': 'leave_available',
      'mouseenter g[class~=subnet]': 'over_subnet',
      'mouseleave g[class~=subnet]': 'leave_subnet',
      'click g[class~=available]': 'click_available',
      'mousedown g[class~=subnet]': 'click_subnet'
    };

    SubnetTree.prototype.height = function() {
      return 0;
    };

    SubnetTree.prototype.width = function(val) {
      if (arguments.length > 0) {
        this._width = val;
        return this;
      } else {
        return this._width || $('#frame')[0].clientWidth;
      }
    };

    SubnetTree.prototype.bar_height = 40;

    SubnetTree.prototype.line = 12;

    SubnetTree.prototype.max_depth = 9;

    SubnetTree.prototype.data_tag = 'g';

    SubnetTree.prototype.data_class = 'ipam-subnet';

    SubnetTree.prototype.text = true;

    SubnetTree.prototype.skip_levels = 0;

    SubnetTree.prototype.subnet = function(s6) {
      var _this = this;
      if (s6 != null) {
        this.s6 = s6;
        this.s6.load_subnets(9, function() {
          _this.rebuild_data();
          return _this.s6.subnet.type().metadata(function(err, md) {
            _this.color = _this.color_by_direction(md);
            if (_this.render_on_load) {
              _this.render();
            }
            return _this.trigger('changed');
          });
        });
        return this;
      } else {
        return this.s6;
      }
    };

    SubnetTree.prototype.rebuild_data = function(add_mask) {
      this.tree = this.s6.tree(add_mask);
      this._data = void 0;
      return this;
    };

    SubnetTree.prototype.render = function() {
      var new_height, tx, vm,
        _this = this;
      vm = this;
      if (this.tree) {
        SubnetTree.__super__.render.apply(this, arguments);
        new_height = d3.max(this.data(), function(d) {
          return d.depth + 1 - vm.skip_levels;
        }) * vm.bar_height;
        tx = this.t(this.svg());
        tx.attr('width', this.width());
        if (new_height < tx.attr('height')) {
          tx = this.t(this.svg()).delay(this.duration * 2);
        }
        tx.attr('height', new_height);
      } else {
        this.render_on_load = true;
      }
      return this;
    };

    SubnetTree.prototype.enter = function(subnet) {
      var vm;
      vm = this;
      subnet.filter(function(d) {
        return d.depth >= vm.skip_levels;
      }).attr('transform', function(d) {
        return 'translate(' + d.x + ',' + (vm.bar_height * (d.depth - vm.skip_levels)) + ')';
      }).attr('clip', 'auto').attr('class', function(d) {
        return this.getAttribute('class') + ' ' + d.type;
      });
      subnet.filter(function(d) {
        return d.depth >= vm.skip_levels;
      }).append('rect').attr('class', 'ipam-subnet-rect').attr('height', this.bar_height).attr('width', function(d) {
        return d.dx;
      }).style('fill', this.color).style('stroke', function(d) {
        if (d.type === 'available') {
          return 'lightgray';
        } else {
          return '';
        }
      }).each(function(d) {
        return $(this).tooltip({
          title: "" + d.name + "<br>" + d.network_address,
          html: true,
          container: 'body',
          placement: 'bottom',
          delay: {
            show: 600,
            hide: 0
          }
        });
      });
      if (this.text) {
        subnet.filter(function(d) {
          return d.depth >= vm.skip_levels;
        }).append('text').attr('class', 'ipam-subnet-ip').attr('y', this.line).attr('x', 3);
        subnet.filter(function(d) {
          return d.depth >= vm.skip_levels;
        }).append('text').attr('class', 'ipam-subnet-direction').attr('y', function(d) {
          return vm.line * 2;
        }).attr('x', 3);
        subnet.filter(function(d) {
          return d.depth >= vm.skip_levels;
        }).append('text').attr('class', 'ipam-subnet-name').attr('y', function(d) {
          return vm.line * 3;
        }).attr('x', 3);
      }
      subnet.filter(function(d) {
        return d.is_new;
      }).append('circle').attr('transform', function(d) {
        return 'translate(2, 2)';
      }).attr('r', 2).attr('fill', 'transparent').attr('stroke-width', 1.5).attr('stroke', 'red');
      return subnet.filter(function(d) {
        return d.is_modified;
      }).append('circle').attr('transform', function(d) {
        return 'translate(2, 2)';
      }).attr('r', 2).attr('fill', 'transparent').attr('stroke-width', 1.5).attr('stroke', 'yellow');
    };

    SubnetTree.prototype.transition = function(subnet) {
      var vm;
      vm = this;
      subnet.attr('transform', function(d) {
        return 'translate(' + d.x + ',' + (vm.bar_height * (d.depth - vm.skip_levels)) + ')';
      }).style('opacity', function(d) {
        if (d.type === 'blank') {
          return 0;
        } else {
          return 1;
        }
      });
      subnet.select('rect').attr('width', function(d) {
        return d.dx;
      }).style('fill', this.color);
      subnet.select('.ipam-subnet-ip').text(this.txt('network_address', -50));
      subnet.select('.ipam-subnet-direction').text(this.txt('direction', 50));
      return subnet.select('.ipam-subnet-name').text(this.txt('name', 50));
    };

    SubnetTree.prototype.color_by_direction = function(md) {
      var color_scale;
      color_scale = d3.scale.ordinal().range(['#034E7B', '#0570B0', '#3690C0', '#74A9CF', '#A6BDDB', '#D0D1E6']).domain(md.properties.direction.options);
      return function(d) {
        if (d.type === 'subnet') {
          return color_scale(d.direction);
        } else {
          return 'white';
        }
      };
    };

    SubnetTree.prototype.data = function() {
      var max_mask, partition;
      if (this._data) {
        return this._data;
      }
      max_mask = lm.Subnet6.max_mask(this.s6.mask());
      partition = d3.layout.partition().sort(null).size([this.width(), 0]).children(function(d) {
        return d.subnets;
      }).value(function(d) {
        return d.width;
      });
      return _.select(partition.nodes(this.tree), function(d) {
        return d.mask < max_mask;
      });
    };

    SubnetTree.prototype.data_identity = function(d) {
      return d.id;
    };

    SubnetTree.prototype.build_subnet = function(d) {
      var Subnet,
        _this = this;
      Subnet = Xn.model('subnet');
      return Subnet.metadata(function(err, md) {
        var s6, subnet, supernet;
        if (err) {
          throw err;
        }
        supernet = Subnet.instance(d.parent_xnid.replace('/model/subnet/id/', ''));
        subnet = Subnet.build({
          network_address: d.network_address,
          direction: supernet.attr('direction')
        });
        subnet.one_rel('supernet', supernet);
        subnet.one_rel('zone', supernet.one_rel('zone'));
        s6 = new lm.Subnet6(subnet);
        return _this.s6.add_subnet(s6, function(err, parent) {
          if (err) {
            throw err;
          }
          _this.trigger('added_subnet', s6);
          _this.rebuild_data();
          _this.render();
          return _this.trigger('changed');
        });
      });
    };

    SubnetTree.prototype.uncreate_subnet = function(xnid) {
      this.s6.remove_subnet(xnid);
      lm.Subnet6.uncreated(xnid);
      this.rebuild_data();
      this.render();
      return this.trigger('changed');
    };

    SubnetTree.prototype.created_subnet = function(xnid, s6) {
      lm.Subnet6.created(xnid, s6);
      return this.rebuild_data();
    };

    SubnetTree.prototype.click_subnet = function(e) {
      var d;
      d = d3.select(e.currentTarget).data()[0];
      if (d.xnid && d.width < 1) {
        return this.trigger('click', d);
      }
    };

    SubnetTree.prototype.click_available = function(e) {
      var d;
      d = d3.select(e.currentTarget).data()[0];
      return this.build_subnet(d);
    };

    SubnetTree.prototype.over_available = function(e) {
      return d3.select(e.currentTarget).select('rect').style('fill', 'green');
    };

    SubnetTree.prototype.leave_available = function(e) {
      return d3.select(e.currentTarget).select('rect').style('fill', 'white');
    };

    SubnetTree.prototype.over_subnet = function(e) {
      if (this.hover) {
        return d3.select(e.currentTarget).select('rect').style('fill', 'green');
      }
    };

    SubnetTree.prototype.leave_subnet = function(e) {
      if (this.hover) {
        return d3.select(e.currentTarget).select('rect').style('fill', this.color);
      }
    };

    return SubnetTree;

  })(D3Controller);

}).call(this);
}, "fe/main": function(exports, require, module) {(function() {
  var Main,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    __slice = [].slice;

  Main = (function(_super) {

    __extends(Main, _super);

    Main.prototype.title = function(string) {
      return function() {
        if (string) {
          return "" + string + " - Lightmesh CMDB";
        } else {
          return "Lightmesh CMDB";
        }
      };
    };

    function Main() {
      this.set_current = __bind(this.set_current, this);

      this.navigate = __bind(this.navigate, this);

      this.to_models = __bind(this.to_models, this);

      this.to_parts = __bind(this.to_parts, this);

      this.to_model = __bind(this.to_model, this);

      this.to_part = __bind(this.to_part, this);

      this.to_printable_report = __bind(this.to_printable_report, this);

      this.to_create = __bind(this.to_create, this);

      this.new_model = __bind(this.new_model, this);

      this.to_home = __bind(this.to_home, this);

      this.to_subnet = __bind(this.to_subnet, this);

      this.to_login = __bind(this.to_login, this);

      this.auth = __bind(this.auth, this);

      this.error = __bind(this.error, this);

      this.bad_news = __bind(this.bad_news, this);

      this.good_news = __bind(this.good_news, this);

      this.notice = __bind(this.notice, this);

      var handler, path, _i, _len, _ref, _ref1;
      Main.__super__.constructor.apply(this, arguments);
      _ref = this._routes();
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        _ref1 = _ref[_i], path = _ref1[0], handler = _ref1[1];
        this.route(path, handler);
      }
    }

    Main.prototype._routes = function() {
      return [['/search/:parts/*glob', this.auth(this.to_parts)], ['/search/:parts', this.auth(this.to_parts)], ['/is/:part/id/:id/printable/:report_name', this.auth(this.to_printable_report)], ['/is/:parts/id/:id', this.auth(this.to_part)], ['/is/:part/:id/printable/:report_name', this.auth(this.to_printable_report)], ['/is/:parts/*glob', this.auth(this.to_parts)], ['/is/:parts', this.auth(this.to_parts)], ['/model/:model/new', this.auth(this.new_model)], ['/model/subnet/id/:id', this.auth(this.to_subnet)], ['/ipam/subnet/id/:id', this.auth(this.to_subnet)], ['/model/subnet/id/:id/:action', this.auth(this.to_subnet)], ['/ipam/subnet/id/:id/:action', this.auth(this.to_subnet)], ['/model/:model/id/:id', this.auth(this.to_model)], ['/model/:model', this.auth(this.to_models)], ['/create', this.auth(this.to_create)], ['/create/*rel', this.auth(this.to_create)], ['/', this.auth(this.to_home)], ['/login', this.to_login], ['/is/:parts/:id', this.auth(this.to_part)], ['/model/subnet/:id', this.auth(this.to_subnet)], ['/ipam/subnet/:id', this.auth(this.to_subnet)], ['/model/subnet/:id/:action', this.auth(this.to_subnet)], ['/ipam/subnet/:id/:action', this.auth(this.to_subnet)], ['/model/:model/:id', this.auth(this.to_model)]];
    };

    Main.prototype.notice = function() {
      var arg, args, _i, _len, _ref, _ref1, _results;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      if (((_ref = this.current) != null ? _ref.notice : void 0) != null) {
        return (_ref1 = this.current).notice.apply(_ref1, args);
      } else {
        _results = [];
        for (_i = 0, _len = args.length; _i < _len; _i++) {
          arg = args[_i];
          _results.push($('#frame').append(arg));
        }
        return _results;
      }
    };

    Main.prototype.good_news = function() {
      var arg, args, _i, _len, _ref, _ref1, _results;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      if (((_ref = this.current) != null ? _ref.good_news : void 0) != null) {
        return (_ref1 = this.current).good_news.apply(_ref1, args);
      } else {
        _results = [];
        for (_i = 0, _len = args.length; _i < _len; _i++) {
          arg = args[_i];
          _results.push($('#frame').append(arg));
        }
        return _results;
      }
    };

    Main.prototype.bad_news = function() {
      var arg, args, _i, _len, _ref, _ref1, _results;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      if (((_ref = this.current) != null ? _ref.bad_news : void 0) != null) {
        return (_ref1 = this.current).bad_news.apply(_ref1, args);
      } else {
        _results = [];
        for (_i = 0, _len = args.length; _i < _len; _i++) {
          arg = args[_i];
          _results.push($('#frame').append(arg));
        }
        return _results;
      }
    };

    Main.prototype.error = function(err) {
      var _base, _base1;
      if (this.current) {
        if (err instanceof Error) {
          return typeof (_base = this.current).bad_news === "function" ? _base.bad_news('Error', err.message).render() : void 0;
        } else {
          return typeof (_base1 = this.current).bad_news === "function" ? _base1.bad_news('Error', err).render() : void 0;
        }
      } else {
        return $('#frame').append(err.message);
      }
    };

    Main.prototype.auth = function(action) {
      var _this = this;
      return function(params) {
        if (Xn.user) {
          return action.apply(_this, [params]);
        } else {
          return Xn.check_token(function(err, user) {
            if (user) {
              return action.apply(_this, [params]);
            } else {
              _this.post_login_path = Spine.Route.getPath();
              return Spine.Route.navigate('/login');
            }
          });
        }
      };
    };

    Main.prototype.to_login = function() {
      var _this = this;
      this.set_current(function() {
        return new Login({
          post_login_path: _this.post_login_path
        }).render();
      });
      return this.post_login_path = null;
    };

    Main.prototype.to_subnet = function(params) {
      var _this = this;
      return lm.Subnet6.find("/model/subnet/id/" + params.id, 'full,partial', function(err, subnet) {
        var action, _ref;
        if (err) {
          return _this.error(err);
        } else if (subnet.is_valid()) {
          action = (_ref = params.action) != null ? _ref : 'view';
          if (_this.current instanceof IPAM) {
            return _this.current.subnet(subnet).event(action).render();
          } else {
            return _this.set_current(function() {
              return new IPAM().subnet(subnet).event(action).render();
            });
          }
        } else {
          return _this.set_current(function() {
            var mp;
            mp = new ModelPage('subnet').instance(subnet.subnet).render();
            mp.notice("Can't use IPAM interface", "The subnet is not valid or complete enough.").render();
            return mp;
          });
        }
      });
    };

    Main.prototype.to_home = function(params) {
      this.set_current();
      return menu.show();
    };

    Main.prototype.new_model = function(params) {
      var _this = this;
      return this.set_current(function() {
        return new NewModelPage(params.model).render();
      });
    };

    Main.prototype.to_create = function(params) {
      var _this = this;
      return this.set_current(function() {
        var rel_url;
        if (params.match[1]) {
          rel_url = '/' + params.match[1];
        }
        return new NewRelatedModelPage({
          rel_url: rel_url
        }).render();
      });
    };

    Main.prototype.to_printable_report = function(_arg) {
      var id, part, report_name,
        _this = this;
      id = _arg.id, part = _arg.part, report_name = _arg.report_name;
      return Xn.is(part).set_rel_limit(1000).find_with_format(id, 'full,full', function(err, m) {
        if (err) {
          return _this.error(err);
        } else {
          return _this.set_current(function() {
            var report_cls;
            report_cls = ReportPage.get(part, report_name);
            return new report_cls({
              part: part,
              report_name: report_name
            }).instance(m).render();
          });
        }
      });
    };

    Main.prototype.to_part = function(params) {
      var parts,
        _this = this;
      parts = params.parts.split(',');
      return Xn.is(parts).find(params.id, function(err, m) {
        if (err) {
          return _this.error(err);
        } else {
          return _this.set_current(function() {
            return new ModelPage(_.last(parts)).instance(m).render();
          });
        }
      });
    };

    Main.prototype.to_model = function(params) {
      var _this = this;
      return Xn.model(params.model).find_with_format(params.id, 'full,partial', function(err, m) {
        if (err) {
          return _this.error(err);
        } else {
          return _this.set_current(function() {
            return new ModelPage(params.model).instance(m).render();
          });
        }
      });
    };

    Main.prototype.to_parts = function(params) {
      var name, parts,
        _this = this;
      parts = params.parts.split(',');
      name = parts.map(dust.filters.capitalize).join(' ');
      return this.set_current(function() {
        return new SearchPage({
          name: name,
          is: parts
        });
      });
    };

    Main.prototype.to_models = function(params) {
      var name,
        _this = this;
      name = dust.filters.capitalize(params.model);
      return Xn.model(params.model, function(err, mod) {
        return _this.set_current(function() {
          return new SearchPage({
            name: name,
            based_on: mod,
            is: mod.descriptive_parts().reverse()
          });
        });
      });
    };

    Main.prototype.navigate = function() {
      document.title = 'LightMesh CMDB';
      if (window.throw_nav_error) {
        throw new Error("navigate method called.");
      }
      return Main.__super__.navigate.apply(this, arguments);
    };

    Main.prototype.set_current = function(block) {
      var _base;
      if (this.current) {
        this.current.release();
      }
      if (block) {
        this.current = block();
      } else {
        this.current = void 0;
      }
      if (this.current) {
        $('#frame').html(this.current.el);
        if (typeof (_base = this.current).added_to_window === "function") {
          _base.added_to_window();
        }
      }
      return this.current;
    };

    return Main;

  })(Spine.Controller);

  window.main = new Main;

  $(window).on('focus', function() {
    var _ref, _ref1;
    return (_ref = window.main) != null ? (_ref1 = _ref.current) != null ? typeof _ref1.on_focus === "function" ? _ref1.on_focus() : void 0 : void 0 : void 0;
  });

  $(window).on('blur', function() {
    var _ref, _ref1;
    return (_ref = window.main) != null ? (_ref1 = _ref.current) != null ? typeof _ref1.on_blur === "function" ? _ref1.on_blur() : void 0 : void 0 : void 0;
  });

  setInterval((function() {
    var _ref, _ref1;
    return (_ref = window.main) != null ? (_ref1 = _ref.current) != null ? typeof _ref1.each_minute === "function" ? _ref1.each_minute() : void 0 : void 0 : void 0;
  }), 1000 * 60);

  setInterval((function() {
    var _ref, _ref1;
    return (_ref = window.main) != null ? (_ref1 = _ref.current) != null ? typeof _ref1.each_quarter === "function" ? _ref1.each_quarter() : void 0 : void 0 : void 0;
  }), 1000 * 60 * 15);

  setInterval((function() {
    var _ref, _ref1;
    return (_ref = window.main) != null ? (_ref1 = _ref.current) != null ? typeof _ref1.each_hour === "function" ? _ref1.each_hour() : void 0 : void 0 : void 0;
  }), 1000 * 60 * 60);

}).call(this);
}, "fe/models/commonality": function(exports, require, module) {(function() {
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  window.Commonality = (function() {

    function Commonality(base_parts) {
      var _ref;
      this.base_parts = base_parts;
      this.add_instance = __bind(this.add_instance, this);

      this.model_names = {};
      this.models = [];
      if ((_ref = this.base_parts) == null) {
        this.base_parts = [];
      }
      this.invalid_names = [];
      this._calls = 0;
      this._on_metadata = [];
    }

    Commonality.prototype.add_instance = function(inst) {
      return this.add_model(inst.model_name());
    };

    Commonality.prototype.remove_instance = function(inst) {
      return this.remove_model(inst.model_name());
    };

    Commonality.prototype.set_base_parts = function(base_parts) {
      this.base_parts = base_parts;
    };

    Commonality.prototype.add_model = function(model_name) {
      if (this.model_names[model_name] != null) {
        return this.model_names[model_name]++;
      } else {
        this._partial = void 0;
        return Xn.model(model_name, this._add_model(model_name));
      }
    };

    Commonality.prototype.remove_model = function(model_name) {
      if (this.model_names[model_name] != null) {
        if (this.model_names[model_name] === 1) {
          this._partial = void 0;
          delete this.model_names[model_name];
          this.invalid_names = this.invalid_names.filter(function(name) {
            return name !== model_name;
          });
          return this.models = this.models.filter(function(mod) {
            return mod.name() !== model_name;
          });
        } else if (this.model_names[model_name] > 0) {
          return this.model_names[model_name]--;
        }
      }
    };

    Commonality.prototype._add_model = function(model_name) {
      var _this = this;
      this._calls++;
      return function(err, model) {
        _this.model_names[model_name] = 1;
        if (err) {
          _this.invalid_names.push(model_name);
        } else {
          _this.models.push(model);
        }
        return _this.on_metadata();
      };
    };

    Commonality.prototype.current_parts = function() {
      var model, model_parts, parts, _i, _len, _ref;
      this.check_invalid();
      parts = void 0;
      _ref = this.models;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        model = _ref[_i];
        model_parts = model.parts();
        if (parts != null) {
          parts = parts.filter(function(p) {
            return model_parts.indexOf(p) >= 0;
          });
        } else {
          parts = model_parts;
        }
      }
      if (!(parts != null) || parts.length === 0) {
        return this.base_parts;
      } else {
        return parts;
      }
    };

    Commonality.prototype.parts = function(callback) {
      var _this = this;
      return this.on_metadata(function() {
        if (callback) {
          return callback(void 0, _this.current_parts());
        } else {
          return _this.current_parts();
        }
      });
    };

    Commonality.prototype.partial = function(callback) {
      var _this = this;
      if (this._partial) {
        return this.on_metadata(function() {
          return callback(void 0, _this._partial);
        });
      } else {
        return this.on_metadata(function() {
          var parts;
          parts = _this.current_parts();
          if ((parts != null) && parts.length > 0) {
            _this._calls++;
            return _this._partial = Xn.partial(parts, function(err, partial) {
              callback(err, partial);
              return _this.on_metadata();
            });
          } else {
            return callback(void 0, void 0);
          }
        });
      }
    };

    Commonality.prototype.model_counts = function() {
      var count, name, _ref, _results;
      _ref = this.model_names;
      _results = [];
      for (name in _ref) {
        count = _ref[name];
        _results.push({
          name: name,
          count: count
        });
      }
      return _results;
    };

    Commonality.prototype.check_invalid = function() {
      if (this.invalid_names.length > 0) {
        throw new Error("Invalid model: " + (this.invalid_names.join(', ')));
      }
    };

    Commonality.prototype.on_metadata = function(callback) {
      var c, callbacks, _i, _len, _results;
      if (callback) {
        if (this._calls === 0) {
          return callback();
        } else {
          this._on_metadata.push(callback);
          return void 0;
        }
      } else {
        if (this._calls > 1) {
          return this._calls--;
        } else {
          this._calls = 0;
          callbacks = this._on_metadata;
          this._on_metadata = [];
          _results = [];
          for (_i = 0, _len = callbacks.length; _i < _len; _i++) {
            c = callbacks[_i];
            _results.push(c());
          }
          return _results;
        }
      }
    };

    return Commonality;

  })();

}).call(this);
}, "fe/models/notifications": function(exports, require, module) {(function() {
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  window.Notification = (function() {

    function Notification(title, level) {
      if (level == null) {
        level = 'success';
      }
      this.title = ko.observable(title);
      this.level = ko.observable(level);
    }

    Notification.prototype.is_clearable = function() {
      return true;
    };

    Notification.prototype.row_template = function() {
      return 'notification/type/general';
    };

    Notification.prototype.to_dust_ctx = function() {
      return {
        title: this.title(),
        level: this.level(),
        template: this.row_template()
      };
    };

    return Notification;

  })();

  window.JobNotification = (function(_super) {
    var JOB_STATUS_TO_LEVEL;

    __extends(JobNotification, _super);

    JOB_STATUS_TO_LEVEL = {
      done: 'success',
      running: 'warning',
      failed: 'danger'
    };

    function JobNotification(title, url, status, job) {
      this.job = job;
      this.on_status_change = __bind(this.on_status_change, this);

      this.url = ko.observable(url);
      this.status = ko.observable(status);
      this.status.subscribe(this.on_status_change);
      JobNotification.__super__.constructor.call(this, title, JOB_STATUS_TO_LEVEL[status]);
    }

    JobNotification.prototype.on_status_change = function(new_status) {
      return this.level(JOB_STATUS_TO_LEVEL[new_status]);
    };

    JobNotification.prototype.is_clearable = function() {
      switch (this.status()) {
        case 'running':
        case 'enqueued':
          return false;
        default:
          return true;
      }
    };

    JobNotification.prototype.row_template = function() {
      return 'notification/type/job';
    };

    JobNotification.prototype.detail_template = function() {
      var template_name;
      template_name = "notification/type/job/" + (this.job.attr('action_name'));
      if (dust.cache[template_name]) {
        return template_name;
      }
    };

    JobNotification.prototype.to_dust_ctx = function() {
      var ctx;
      ctx = {
        url: this.url(),
        status: this.status(),
        value: this.job.attr('value'),
        detail_template: this.detail_template()
      };
      return _.extend(ctx, JobNotification.__super__.to_dust_ctx.apply(this, arguments));
    };

    return JobNotification;

  })(Notification);

}).call(this);
}, "fe/root": function(exports, require, module) {(function() {

  module.exports = require('./_base');

}).call(this);
}, "fe/service/print_service": function(exports, require, module) {(function() {
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  window.PrintService = (function() {

    function PrintService(_arg) {
      var page_rule, style_sheet, _i, _len, _ref;
      this.print_frame = _arg.print_frame, this.screen_frame = _arg.screen_frame;
      this.print = __bind(this.print, this);

      this.print_current_root = __bind(this.print_current_root, this);

      jwerty.key('cmd+p/ctrl+p', this.print_current_root);
      _ref = document.styleSheets;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        style_sheet = _ref[_i];
        if (page_rule = _.find(style_sheet.cssRules, function(rule) {
          return rule instanceof CSSPageRule;
        })) {
          this.page_rule = page_rule;
          break;
        }
      }
      if (this.page_rule == null) {
        console.error('No page rule found');
        this.page_rule = {};
      }
    }

    PrintService.prototype.print_current_root = function(e) {
      var _ref;
      e.preventDefault();
      return (_ref = window.main.current) != null ? _ref.print() : void 0;
    };

    PrintService.prototype.print = function(_arg) {
      var controller, margin, paper_size,
        _this = this;
      paper_size = _arg.paper_size, controller = _arg.controller, margin = _arg.margin;
      if (!controller) {
        throw new Error('A printable controller must be specified');
      }
      return this.prepare_print_frame(controller, function() {
        var orig_page_settings, orig_title;
        orig_page_settings = _this.page_settings();
        orig_title = window.title;
        try {
          if (controller.attr('title')) {
            window.title = controller.attr('title');
          }
          _this.page_settings({
            paper_size: paper_size,
            margin: margin
          });
          return window.print();
        } finally {
          _this.page_settings(orig_page_settings);
          window.title = orig_title;
        }
      });
    };

    PrintService.prototype.prepare_print_frame = function(controller, print_callback) {
      var placeholder, print_element;
      print_element = this.print_element(controller);
      placeholder = this.new_placeholder();
      try {
        print_element.replaceWith(placeholder);
        this.print_frame.append(print_element);
        this.screen_frame.addClass('hidden-print');
        return print_callback();
      } finally {
        placeholder.replaceWith(print_element);
        this.screen_frame.removeClass('hidden-print');
      }
    };

    PrintService.prototype.print_element = function(controller) {
      return controller.attr('print_element') || controller.el;
    };

    PrintService.prototype.new_placeholder = function() {
      return $('<div class=print-placeholder></div>');
    };

    PrintService.prototype.page_settings = function(value) {
      if (value) {
        if (value.paper_size) {
          this.page_rule.style.size = value.paper_size;
        }
        if (value.margin) {
          return this.page_rule.style.margin = value.margin;
        }
      } else {
        return {
          paper_size: this.page_rule.style.size,
          margin: this.page_rule.style.margin
        };
      }
    };

    return PrintService;

  })();

}).call(this);
}, "fe/util/core_ext": function(exports, require, module) {(function() {

  Date.prototype.hasTime = function() {
    return (this.getHours() || this.getMinutes() || this.getSeconds() || this.getMilliseconds()) > 0;
  };

  Date.prototype.hasDate = function() {
    return !(this.getFullYear() === 1970 && this.getDayOfYear() === 0);
  };

}).call(this);
}, "fe/util/inflections": function(exports, require, module) {(function() {
  var Inflector,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  Inflector = (function() {

    function Inflector() {
      this.uppercase_acronym = __bind(this.uppercase_acronym, this);

      this.uppercase = __bind(this.uppercase, this);

      this.humanize = __bind(this.humanize, this);

      this.capitalize = __bind(this.capitalize, this);
      this.uncountables = {};
      this.acronyms = {};
    }

    Inflector.prototype.irregular = function(singular, plural) {};

    Inflector.prototype.uncountable = function(s) {
      if (s) {
        return this.uncountables[s.toLowerCase()] = true;
      }
    };

    Inflector.prototype.acronym = function(s) {
      if (s) {
        return this.acronyms[s.toLowerCase()] = s;
      }
    };

    Inflector.prototype.capitalize = function(s) {
      var words;
      s = ('' + s).replace(/_/g, ' ');
      words = s.split(' ');
      return _.map(words, this.uppercase).join(' ');
    };

    Inflector.prototype.humanize = function(s) {
      var f, words,
        _this = this;
      s = ('' + s).replace(/_/g, ' ');
      words = s.split(' ');
      f = this.uppercase;
      words = _.map(words, function(w) {
        if (w) {
          w = f(w);
          f = _this.uppercase_acronym;
        }
        return w;
      });
      return words.join(' ');
    };

    Inflector.prototype.uppercase = function(word) {
      var ack, letter;
      word = '' + word;
      ack = this.acronyms[word.toLowerCase()];
      if (ack) {
        return ack;
      } else if (letter = word[0]) {
        return letter.toUpperCase() + word.substr(1);
      } else {
        return word;
      }
    };

    Inflector.prototype.uppercase_acronym = function(word) {
      var ack;
      word = '' + word;
      ack = this.acronyms[word.toLowerCase()];
      if (ack) {
        return ack;
      } else {
        return word;
      }
    };

    return Inflector;

  })();

  window.inflect = new Inflector;

  inflect.uncountable("switch_chassis");

  inflect.uncountable("SwitchChassis");

  inflect.uncountable("blade_chassis");

  inflect.uncountable("BladeChassis");

  inflect.uncountable("media");

  inflect.uncountable("cable_media");

  inflect.uncountable("network_media");

  inflect.uncountable("SwitchVSS");

  inflect.uncountable("IPAM");

  inflect.uncountable("ITIL");

  inflect.uncountable("applied_to");

  inflect.uncountable("software");

  inflect.irregular("vrf", "vrfs");

  inflect.acronym('IPAM');

  inflect.acronym('DNS');

  inflect.acronym('FEX');

  inflect.acronym('GW');

  inflect.acronym('GWs');

  inflect.acronym('IP');

  inflect.acronym('IPs');

  inflect.acronym('ITIL');

  inflect.acronym('MAC');

  inflect.acronym('MACs');

  inflect.acronym('RFC');

  inflect.acronym('RFCs');

  inflect.acronym('SAN');

  inflect.acronym('SANs');

  inflect.acronym('SLA');

  inflect.acronym('SLAs');

  inflect.acronym('SSH');

  inflect.acronym('SSL');

  inflect.acronym('URI');

  inflect.acronym('URIs');

  inflect.acronym('URL');

  inflect.acronym('URLs');

  inflect.acronym('VLAN');

  inflect.acronym('VLANs');

  inflect.acronym('VM');

  inflect.acronym('VMs');

  inflect.acronym('VRF');

  inflect.acronym('VRFs');

  inflect.acronym('VSS');

}).call(this);
}, "fe/util/jquery_plugins": function(exports, require, module) {(function() {

  jQuery.fn["class"] = function(css_class, test) {
    var grouped;
    if (typeof test === 'function') {
      grouped = _.groupBy(this, function(el) {
        if (test(el)) {
          return true;
        } else {
          return false;
        }
      });
      jQuery(grouped[true]).addClass(css_class);
      jQuery(grouped[false]).removeClass(css_class);
      return this;
    } else if (test) {
      return this.addClass(css_class);
    } else {
      return this.removeClass(css_class);
    }
  };

  jQuery.fn.more = function(options) {
    var content, disclosure_link, less_text, max_length, more_text, post_content, pre_content, _ref;
    _ref = _.defaults(options, {
      less_text: ' (less)',
      more_text: '...(more)',
      max_length: 250
    }), less_text = _ref.less_text, more_text = _ref.more_text, max_length = _ref.max_length;
    if (!this.length) {
      return;
    }
    content = $(this).html();
    if (!(content.length > max_length)) {
      return;
    }
    pre_content = $("<span>" + (content.substr(0, max_length)) + "</span>");
    post_content = $("<span style='display: inline;'>" + (content.substr(max_length)) + "</span>").hide();
    disclosure_link = $("<a class=disclosure-link href=#>      <span>" + more_text + "</span>      <span style='display: none'>" + less_text + "</span>    </a>").click(function(e) {
      return post_content.add($(this).find('span')).toggle(0);
    });
    return $(this).empty().append(pre_content, post_content, disclosure_link);
  };

  jQuery.fn.isAttached = function() {
    return this.parents(':last').is('html');
  };

  jQuery.__transitionEvents = 'transitionend webkitTransitionEnd oTransitionEnd';

  jQuery.fn.transitionEnd = function(callback) {
    return this.bind(jQuery.__transitionEvents, callback);
  };

  jQuery.fn.plainText = function() {
    var clone;
    clone = this.clone();
    clone.find('div').replaceWith(function() {
      return "<span>\n</span>" + this.innerHTML;
    });
    clone.find('p').replaceWith(function() {
      return "<span>\n</span>" + this.innerHTML + "<span>\n</span>";
    });
    clone.find('br').each(function() {
      var $this;
      $this = $(this);
      if ($this.parent().contents().size() === 1) {
        return $this.parent().replaceWith('<span>\n</span>');
      } else {
        return $this.replaceWith('<span>\n</span>');
      }
    });
    return clone.text().trim().replace(RegExp("" + (String.fromCharCode(160)) + "|" + (String.fromCharCode(194)), "gi"), ' ');
  };

}).call(this);
}, "fe/util/patterns": function(exports, require, module) {(function() {

  window.Patterns = (function() {

    function Patterns() {}

    Patterns.WEB_URL = /https?:\/\/[^\s\<]+/g;

    Patterns.EMAIL_ADDRESS = /[a-zA-Z0-9\+\.\_\%\-\+]{1,256}\@[a-zA-Z0-9][a-zA-Z0-9\-]{0,64}(\.[a-zA-Z0-9][a-zA-Z0-9\-]{0,25})+/g;

    return Patterns;

  })();

}).call(this);
}, "fe/util/t": function(exports, require, module) {(function() {
  var __slice = [].slice;

  window.T = {
    zip_xn_tree: function(tree, make_inst) {
      var subtree;
      subtree = function(arr) {
        var children, id;
        if (arr.length === 1) {
          return make_inst(arr[0]);
        } else {
          id = arr[0], children = 2 <= arr.length ? __slice.call(arr, 1) : [];
          return make_inst(id, T.zip_xn_tree(children, make_inst));
        }
      };
      return _.map(tree, subtree);
    },
    map_tree: function(tree, map_fn, depth, parent) {
      var children;
      if (depth == null) {
        depth = 0;
      }
      if (tree.children) {
        children = _.map(tree.children, function(child) {
          return T.map_tree(child, map_fn, depth + 1, tree);
        });
      }
      return map_fn(tree, depth, children, parent);
    },
    hierarchy: function(rel_name, depth, get_data, size_factor) {
      return function(inst) {
        var p;
        p = kew.defer();
        if (size_factor == null) {
          size_factor = 3;
        }
        Xn.data.get("" + (inst.url()) + "/hierarchy/" + rel_name + "/" + depth, p.makeNodeResolver());
        return p.then(function(tree) {
          return get_data(_.unique(_.flatten(tree))).then(function(insts) {
            var result;
            insts = _.groupBy(insts, function(i) {
              return i.id();
            });
            result = T.zip_xn_tree(tree, function(id, children) {
              var i, o;
              o = {
                id: id,
                size: 1
              };
              if (children) {
                o.children = children;
              }
              if (i = insts[id]) {
                o.name = i[0].attr('display_name');
              }
              return o;
            });
            return T.map_tree(result[0], function(t, d) {
              t.size = Math.pow(size_factor, depth - d + 1);
              return t;
            });
          });
        });
      };
    },
    tree: function(part, rel_name, depth, size_factor) {
      var f;
      f = function(ids) {
        return Xn.is([part]).search(ids).set_format('properties').set_limit(ids.length).all();
      };
      return T.hierarchy(rel_name, depth, f, size_factor);
    },
    rel_tree: function(rel, depth, size_factor) {
      var p,
        _this = this;
      p = kew.defer();
      rel.load(function(r) {
        return p.resolve(r);
      });
      return function(inst) {
        return p.then(function(r) {
          var f;
          f = function(ids) {
            return r.type().search(ids).set_format('properties').set_limit(ids.length).all();
          };
          return T.hierarchy(r.name, depth, f, size_factor)(inst);
        });
      };
    },
    zone_tree: function(depth, size_factor) {
      return this.tree('zone', 'child_zones', depth, size_factor);
    }
  };

}).call(this);
}, "fe/util/template/dust_filters": function(exports, require, module) {(function() {
  var date_templates, format, _i, _len, _ref;

  date_templates = {
    short_date_format: 'M d, Y',
    date_format: 'D, M. jS Y',
    time_format: 'g:ia'
  };

  _ref = ['short_date_format', 'date_format', 'time_format'];
  for (_i = 0, _len = _ref.length; _i < _len; _i++) {
    format = _ref[_i];
    if (dust.cache[format]) {
      dust.render(format, dust.makeBase(), function(err, f) {
        return date_templates[format] = f;
      });
    }
  }

  dust.filters.linkify = function(value) {
    return value.replace(Patterns.WEB_URL, "<a href=\"$&\">$&</a>").replace(Patterns.EMAIL_ADDRESS, "<a href=\"mailto:$&\">$&</a>");
  };

  dust.filters.money = function(value) {
    var num, pennies, str, whole;
    num = Number(value);
    if (!isNaN(num)) {
      pennies = "" + (Math.round(num * 100) % 100);
      whole = Math.floor(num);
      str = ("." + pennies + "00").substr(0, 3);
      while (whole > 0) {
        str = "," + (whole % 1000) + str;
        whole = Math.floor(whole / 1000);
      }
      return "$ " + str.substr(1);
    }
  };

  dust.filters.initials = function(value) {
    return _.map(value.trim().split(' '), function(word) {
      return word.charAt(0);
    }).join('').toUpperCase();
  };

  dust.filters.short = function(value) {
    var date;
    if (value) {
      date = new Date(value);
      format = [];
      if (date.valueOf()) {
        if (date.hasDate()) {
          format.push(date_templates.short_date_format);
        }
        if (date.hasTime()) {
          format.push(date_templates.time_format);
        }
        return date.format(format.join(' '));
      }
    }
  };

  dust.filters.long = function(value) {
    var date;
    if (value) {
      date = new Date(value);
      format = [];
      if (date.valueOf()) {
        if (date.hasDate()) {
          format.push(date_templates.date_format);
        }
        if (date.hasTime()) {
          format.push(date_templates.time_format);
        }
        return date.format(format.join(' '));
      }
    }
  };

  dust.filters.datetime = function(value) {
    var date;
    if (value) {
      date = new Date(value);
      if (date.valueOf()) {
        return date.format("" + date_templates.date_format + " " + date_templates.time_format);
      }
    }
  };

  dust.filters.time = function(value) {
    var date;
    if (value) {
      date = new Date(value);
      if (date.valueOf()) {
        return date.format(date_templates.time_format);
      }
    }
  };

  dust.filters.date = function(value) {
    var date;
    if (value) {
      date = new Date(value);
      if (date.valueOf()) {
        return date.format(date_templates.date_format);
      }
    }
  };

  dust.filters.iso_date = function(value) {
    if (value) {
      return new Date(value).toString('yyyy-MM-dd');
    }
  };

  dust.filters.iso_datetime = function(value) {
    if (value) {
      return new Date(value).toISOString();
    }
  };

  dust.filters.friendly_date = function(value, historical_date_format) {
    var today, yesterday;
    if (historical_date_format == null) {
      historical_date_format = date_templates.short_date_format;
    }
    if (value) {
      value = Date.parse(value);
      today = Date.today();
      yesterday = today.clone().add({
        days: -1
      });
      if (value.isAfter(today)) {
        return dust.filters.time(value);
      } else if (value.isAfter(yesterday)) {
        return "Yesterday " + (dust.filters.time(value));
      } else {
        return value.format(historical_date_format);
      }
    }
  };

  dust.filters.pre_json = function(value) {
    if (value) {
      value = JSON.parse(value);
      return value.join("\n");
    }
  };

  dust.filters.friendly_date_with_time = function(value) {
    return dust.filters.friendly_date(value, "" + date_templates.short_date_format + " " + date_templates.time_format);
  };

  dust.filters.upcase = function(value) {
    if (value) {
      return value.toUpperCase();
    }
  };

  dust.filters.capitalize = function(value) {
    return inflect.capitalize(value);
  };

  dust.filters.yesno = function(value) {
    if (value) {
      return 'Yes';
    } else {
      return 'No';
    }
  };

  dust.filters.http = function(value) {
    var match;
    match = /(:\/\/)|(\s)|(\\\\)/i.exec(value);
    if (match) {
      return value;
    } else {
      return 'http://' + value;
    }
  };

  dust.filters.htmlify = function(value) {
    return '<p>' + value.split(/\n\n/g).join('</p><p>').replace(/\s{2}/, ' &nbsp;').replace(/\n/g, '<br>') + '</p>';
  };

  dust.filters.humanize = function(value) {
    return inflect.humanize(value);
  };

  dust.filters.dehumanize = function(humanized_value) {
    return humanized_value.toLowerCase().replace(/\s/g, '_');
  };

}).call(this);
}, "fe/util/template/results_helper": function(exports, require, module) {(function() {
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  window.ResultsHelper = (function() {

    function ResultsHelper(chunk, context, blocks, options, app) {
      var _base, _base1, _base2, _base3, _base4, _ref, _ref1, _ref2, _ref3, _ref4,
        _this = this;
      this.context = context;
      this.app = app != null ? app : Xn;
      this.find_records = __bind(this.find_records, this);

      this.cursor = chunk.map(function(chunk) {
        _this.chunk = chunk;
      });
      this.options = options || {};
      this.options.r_nested = true;
      if ((_ref = (_base = this.options).r_size) == null) {
        _base.r_size = this.size(this.context);
      }
      if ((_ref1 = (_base1 = this.options).r_has_details) == null) {
        _base1.r_has_details = this.has_details(this.context);
      }
      if ((_ref2 = (_base2 = this.options).r_has_meta) == null) {
        _base2.r_has_meta = this.has_meta(this.context);
      }
      if ((_ref3 = (_base3 = this.options).r_has_id) == null) {
        _base3.r_has_id = this.has_id(this.context);
      }
      if ((_ref4 = (_base4 = this.options).r_classes) == null) {
        _base4.r_classes = this.classes(this.context);
      }
      this.block = blocks != null ? blocks.block : void 0;
    }

    ResultsHelper.prototype.path = function() {
      var path;
      path = '';
      if (this.block) {
        this.chunk.tap(function(p) {
          path = p;
          return '';
        });
        this.chunk.render(this.block, this.context);
        this.chunk.untap();
      }
      this.path = function() {
        return path;
      };
      return path;
    };

    ResultsHelper.prototype.segments = function() {
      var path;
      path = this.path().split('||')[0].trim();
      return path.split('.').filter(function(s) {
        return s;
      });
    };

    ResultsHelper.prototype.remote_path = function() {
      var paths;
      paths = this.path().split('||').map(function(s) {
        return s.trim();
      }).filter(function(s) {
        return s;
      });
      if (paths[1]) {
        return paths[1];
      } else if (paths[0] && paths[0][0] !== '.') {
        return paths[0].split('.').join('/');
      } else {
        return '';
      }
    };

    ResultsHelper.prototype.local_records = function() {
      var r;
      if (this.segments().length > 0) {
        r = this.context.getPath(false, this.segments());
        return r;
      }
    };

    ResultsHelper.prototype.find_records = function(xnid, path, format, callback) {
      return this.app.xnid(xnid).resource(path).all(function(err, insts) {
        var inst;
        if (err) {
          return callback(err, insts);
        } else {
          insts.sort(function(a, b) {
            if (a._data.display_name < b._data.display_name) {
              return -1;
            } else if (a._data.display_name > b._data.display_name) {
              return 1;
            } else {
              return 0;
            }
          });
          return callback(err, (function() {
            var _i, _len, _results;
            _results = [];
            for (_i = 0, _len = insts.length; _i < _len; _i++) {
              inst = insts[_i];
              _results.push(inst.toJSON());
            }
            return _results;
          })());
        }
      });
    };

    ResultsHelper.prototype.remote_records = function(callback) {
      var path, xnid;
      if (path = this.remote_path()) {
        xnid = this.context.get('xnid') || this.context.getPath(true, ['meta', 'xnid']);
        if (xnid) {
          return this.find_records(xnid, path, this.format(this.context), callback);
        }
      }
      return callback();
    };

    ResultsHelper.prototype.records = function(callback) {
      var records;
      if (records = this.local_records()) {
        return callback(void 0, records);
      } else {
        return this.remote_records(callback);
      }
    };

    ResultsHelper.prototype.render = function() {
      var _this = this;
      this.records(function(err, records) {
        var idx, record, record_context, _i, _len;
        record_context = _this.context.push(_this.options);
        if (err) {
          _this.chunk.end();
          if (typeof console !== "undefined" && console !== null) {
            console.log('error rendering records', err);
          }
          if (err.constructor === Error) {
            throw err;
          } else {
            throw new Error('error rendering records: ' + err);
          }
        }
        if (records) {
          if (_.isArray(records)) {
            for (idx = _i = 0, _len = records.length; _i < _len; idx = ++_i) {
              record = records[idx];
              _this.render_record(record_context, record, idx, records.length);
            }
          } else {
            _this.render_record(record_context, records);
          }
          return _this.chunk.end();
        } else {
          return _this.chunk.end();
        }
      });
      return this.cursor;
    };

    ResultsHelper.prototype.render_record = function(record_context, record, idx, length) {
      var context,
        _this = this;
      context = record_context.push(record, idx, length);
      return this.find_template(context, function(template) {
        return _this.chunk = _this.chunk.map(function(c) {
          c = c.partial(template, context);
          return c.end();
        });
      });
    };

    ResultsHelper.prototype.size = function(context) {
      return context.get('r_size') || 'medium';
    };

    ResultsHelper.prototype.format = function(context) {
      switch (this.size(context)) {
        case 'tiny':
        case 'compact':
        case 'inline':
          return 'compact';
        default:
          if (context.get('r_nested')) {
            return 'compact';
          } else {
            return 'full';
          }
      }
    };

    ResultsHelper.prototype.has_details = function(context) {
      return !context.get('r_nested') && this.format(context) === 'full';
    };

    ResultsHelper.prototype.has_meta = function(context) {
      return !context.get('r_nested') && context.get('r_has_meta');
    };

    ResultsHelper.prototype.has_id = function(context) {
      return !context.get('r_nested') && context.get('r_has_id');
    };

    ResultsHelper.prototype.classes = function(context) {
      return !context.get('r_nested') && context.get('r_classes');
    };

    ResultsHelper.prototype.find_template = function(context, callback) {
      var _this = this;
      return this.specified_template(context, callback, function() {
        return _this.custom_template(context, callback, function() {
          return _this.default_template(context, callback, function() {
            return "r/default";
          });
        });
      });
    };

    ResultsHelper.prototype.specified_template = function(context, callback, fallback) {
      var t;
      t = this.context.get('r_nested') ? context.get('r_nested_template') : context.get('r_template');
      if (t) {
        return callback(t);
      } else {
        return fallback();
      }
    };

    ResultsHelper.prototype.default_template = function(context, callback, fallback) {
      var t;
      t = this.context.get('r_nested') ? context.get('r_default_nested_template') : context.get('r_default_template');
      if (t) {
        return callback(t);
      } else {
        return fallback();
      }
    };

    ResultsHelper.prototype.custom_template = function(context, callback, fallback) {
      var rendered_format, rendered_part, template;
      rendered_part = context.getPath(true, ['meta', 'rendered']);
      rendered_format = context.getPath(true, ['meta', 'format']);
      template = "r/" + rendered_part + "/" + rendered_format;
      if (dust.cache[template]) {
        return callback(template);
      } else {
        template = "r/" + rendered_part;
        if (dust.cache[template]) {
          return callback(template);
        } else {
          return fallback();
        }
      }
    };

    return ResultsHelper;

  })();

}).call(this);
}, "fe/util/template/template_helpers": function(exports, require, module) {(function() {
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __slice = [].slice;

  window.TemplateHelpers = (function() {

    TemplateHelpers.prototype.base_url = "" + window.location.protocol + "//" + window.location.host;

    TemplateHelpers.prototype.r_default_template = 'r/default';

    TemplateHelpers.prototype.r_default_nested_template = 'r/default';

    TemplateHelpers.prototype._form_counter = 0;

    TemplateHelpers.prototype._tip_counter = 0;

    TemplateHelpers.prototype._more_counter = 0;

    TemplateHelpers.make = function() {
      var args, key, _base;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      var helper_cls = this;

      this.helper_cache || (this.helper_cache = {});
      key = _.map([helper_cls].concat(args), function(it) {
        return it + "";
      });
      return (_base = this.helper_cache)[key] || (_base[key] = (function(func, args, ctor) {
        ctor.prototype = func.prototype;
        var child = new ctor, result = func.apply(child, args);
        return Object(result) === result ? result : child;
      })(helper_cls, args, function(){}).make_dust_base());
    };

    function TemplateHelpers(app) {
      this.app = app != null ? app : Xn;
      this.user_avatar = __bind(this.user_avatar, this);

      this.reverse = __bind(this.reverse, this);

      this.format_date = __bind(this.format_date, this);

      this.batch = __bind(this.batch, this);

      this.custom = __bind(this.custom, this);

      this.action = __bind(this.action, this);

      this.relationship = __bind(this.relationship, this);

      this.property = __bind(this.property, this);

      this.more = __bind(this.more, this);

    }

    TemplateHelpers.prototype.make_dust_base = function() {
      return window.dust.makeBase(this);
    };

    TemplateHelpers.prototype.r = function(c, ctx, blocks, options) {
      if (options && options.r_options) {
        options = _.extend({}, options, options.r_options);
      }
      return new ResultsHelper(c, ctx, blocks, options).render();
    };

    TemplateHelpers.prototype.rn_inline = function(c, ctx, blocks, options) {
      return c.section(ctx.get('r'), ctx, blocks, {
        r_options: options,
        r_handle: 'no-',
        r_size: 'inline'
      });
    };

    TemplateHelpers.prototype.r_inline = function(c, ctx, blocks, options) {
      return c.section(ctx.get('r'), ctx, blocks, {
        r_options: options,
        r_size: 'inline'
      });
    };

    TemplateHelpers.prototype.a = function(c, ctx, blocks, options) {
      if (blocks != null ? blocks.block : void 0) {
        if (options != null ? options.href : void 0) {
          return c.write("<a href='" + options.href + "'>").render(blocks.block, ctx).write("</a>");
        } else {
          return c.render(blocks.block, ctx);
        }
      } else {
        if (options != null ? options.href : void 0) {
          return c.write("<a href='" + options.href + "'>" + (ctx.current()) + "</a>");
        } else {
          return c.write(ctx.current());
        }
      }
    };

    TemplateHelpers.prototype.more = function(c, ctx, blocks, _arg) {
      var max_length;
      max_length = (_arg != null ? _arg : {
        max_length: 250
      }).max_length;
      this._more_counter++;
      c.write("<div id=__more-" + this._more_counter + " class=more-container>").render(blocks.block, ctx).write('</div>').write(this._deferred_script("       $('#__more-" + this._more_counter + "').more({ max_length: " + max_length + " });     "));
      return c;
    };

    TemplateHelpers.prototype.part_name = function(c, ctx, blocks, options) {
      return c.write('<h2 class="part-name wf-step-name">').render(blocks.block, ctx).write('</h2>');
    };

    TemplateHelpers.prototype.part_data = function(c, ctx, blocks, options) {
      return c.write('<div class=dv-data>').render(blocks.block, ctx).write('</div>');
    };

    TemplateHelpers.prototype.field = function(c, ctx, blocks, options) {
      var v, _i, _j, _len, _len1, _ref, _ref1;
      if ((options != null ? options.value : void 0) || (options != null ? options["if"] : void 0)) {
        c.write("<div class=r-prop><span class=r-field>" + (options != null ? options.label : void 0) + "</span><span class=r-value>");
        if (blocks != null ? blocks.block : void 0) {
          if (options.value) {
            if (Array.isArray(options.value)) {
              c.write('<ul>');
              _ref = options.value;
              for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                v = _ref[_i];
                c.write('<li>');
                c = c.render(blocks.block, ctx.push(v));
                c.write('</li>');
              }
              c.write('</ul>');
            } else {
              c = c.render(blocks.block, ctx.push(options.value));
            }
          } else {
            c = c.render(blocks.block, ctx);
          }
        } else if (Array.isArray(options.value)) {
          c.write('<ul>');
          _ref1 = options.value;
          for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
            v = _ref1[_j];
            c.write("<li>" + v + "</li>");
          }
          c.write('</ul>');
        } else {
          c.write(options.value);
        }
        return c.write('</span></div>');
      } else {
        return c;
      }
    };

    TemplateHelpers.prototype.filter = function(c, ctx, blocks, options) {
      if (options != null ? options["for"] : void 0) {
        return c.write("        <div class=filter data-for=" + options["for"] + ">          <label for=filter-" + options["for"] + ">" + options.label + "</label>        </div>");
      } else {
        return c;
      }
    };

    TemplateHelpers.prototype.property = function(c, ctx, blocks, options) {
      var data_attrs;
      if (options != null ? options.name : void 0) {
        data_attrs = this._data_attributes(options);
        return c.write("        <div class=dv-property data-property=" + options.name + " " + data_attrs + ">          <div class=dv-label>" + options.label + "</div>          <div class=dv-edit></div>          <div class=dv-value></div>        </div>");
      } else {
        return c;
      }
    };

    TemplateHelpers.prototype.relationship = function(c, ctx, blocks, options) {
      var data_attrs;
      if (options != null ? options.name : void 0) {
        data_attrs = this._data_attributes(options);
        return c.write("        <div class=dv-property data-relationship=" + options.name + " " + data_attrs + ">          <div class=dv-label>" + options.label + "</div>          <div class=dv-edit></div>          <div class=dv-value></div>        </div>");
      } else {
        return c;
      }
    };

    TemplateHelpers.prototype.table = function(c, ctx, blocks, options) {
      if (options != null ? options.name : void 0) {
        return c.write("<div class=dv-property data-control=table name=" + options.name + " label=\"" + options.label + "\">").render(blocks.block, ctx).write('</div>');
      } else {
        return c;
      }
    };

    TemplateHelpers.prototype.traversal = function(c, ctx, blocks, options) {
      if (options != null ? options.name : void 0) {
        return c.write("        <div class=dv-traversal data-category=queries data-method-type=" + options.type + " data-method-name=" + options.name + ">          <a>" + options.label + "</a>        </div>");
      } else {
        return c;
      }
    };

    TemplateHelpers.prototype.action = function(c, ctx, blocks, _arg) {
      var label, name, reload_instance, result_controller, type;
      label = _arg.label, type = _arg.type, name = _arg.name, result_controller = _arg.result_controller, reload_instance = _arg.reload_instance;
      if (name != null) {
        c.write("        <div class=dv-action data-category=actions data-method-type=" + type + " data-method-name=" + name + " ");
        if (result_controller) {
          c.write("data-result-controller=" + result_controller + " ");
        }
        if (reload_instance) {
          c.write("data-reload-instance ");
        }
        c.write(">          <div class='box-layout horizontal'>            <div class='btn-group flexible box-layout horizontal'>              <button class='run-action btn btn-small flexible' title='" + label + "'>" + label + "</button>");
        if (result_controller) {
          c.write("              <button class='show-last btn btn-small' title='Show last results' disabled><i class=icon-reply></i></button>");
        }
        c.write("            </div>            <div class=dv-action-help>");
        if (blocks.help) {
          this.help(c, ctx, blocks);
        }
        c.write("            </div>          </div>");
        if (blocks.block) {
          c.write("          <form id='action-args-" + type + "-" + name + "-" + (this._form_counter++) + "' class=dv-action-args style='display:none;'>");
          c.render(blocks.block, ctx);
          c.write("          </form>");
        }
        return c.write("        </div>");
      } else {
        return c;
      }
    };

    TemplateHelpers.prototype.printable = function(c, ctx, blocks, _arg) {
      var label, name, part, url;
      label = _arg.label, name = _arg.name, part = _arg.part;
      if (name) {
        url = "/is/" + part + "/id/" + (ctx.get('id')) + "/printable/" + name;
        return c.write("        <div class=dv-action data-category=actions>          <div class='btn-group box-layout horizontal'>            <a class='btn flexible' href=\"" + url + "\" target=_blank><i class=icon-print></i> " + label + "</a>            <div class=dv-action-help></div>          </div>        </div>");
      } else {
        return c;
      }
    };

    TemplateHelpers.prototype.help = function(c, ctx, blocks, _arg) {
      var help_block, html, placement, _ref;
      _ref = _arg != null ? _arg : {
        html: true,
        placement: 'top'
      }, html = _ref.html, placement = _ref.placement;
      help_block = blocks.help || blocks.block;
      if (help_block != null) {
        c.write("        <a id=__tt-" + this._tip_counter + " class=help href=#><i class=icon-question-sign></i></a>        <script type='text/javascript'>          $('#__tt-" + this._tip_counter + "').tooltip({            html: " + html + ",            title: '");
        c.tap(dust.escapeJs).render(help_block, ctx).untap();
        c.write("',            placement: '" + placement + "'          })        </script>");
        this._tip_counter++;
        return c;
      } else {
        return c;
      }
    };

    TemplateHelpers.prototype.custom = function(c, ctx, blocks, options) {
      var data_attrs;
      if (options != null ? options.name : void 0) {
        data_attrs = this._data_attributes(options);
        c.write("        <div class=dv-custom data-control=" + options.name + " " + data_attrs + ">          <div class=dv-label>" + (options.label || '') + "</div>          <div class=dv-edit></div>          <div class=dv-value></div>        </div>");
        return c;
      } else {
        return c;
      }
    };

    TemplateHelpers.prototype.batch = function(c, ctx, blocks, _arg) {
      var batch_size,
        _this = this;
      batch_size = _arg.batch_size;
      _.eachSlice(ctx.current(), batch_size, function(slice) {
        return c.render(blocks.block, ctx.push({
          elements: slice
        }));
      });
      return c;
    };

    TemplateHelpers.prototype.format_date = function(c, ctx, blocks, _arg) {
      var date, default_filter, filter;
      date = _arg.date, filter = _arg.filter, default_filter = _arg.default_filter;
      filter || (filter = default_filter);
      return c.write(dust.filters[filter](date));
    };

    TemplateHelpers.prototype.reverse = function(c, ctx, blocks, options) {
      var element, i, len, reversed, _i, _len, _ref;
      reversed = ctx.current().slice(0).reverse();
      len = reversed.length;
      _ref = ctx.current().slice(0).reverse();
      for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
        element = _ref[i];
        c.render(blocks.block, ctx.push(element, i, length));
      }
      return c;
    };

    TemplateHelpers.prototype.user_avatar = function(c, ctx, blocks, _arg) {
      var match, sample_matcher, url, user;
      user = _arg.user;
      if (user != null) {
        sample_matcher = /([^@]+)@sample\d{3}\.com/gi;
        url = (match = sample_matcher.exec(user.email)) ? "/images/sample_avatars/" + match[1] + ".png" : (url = "https://secure.gravatar.com/avatar/", url += user.email_hash, url += "?s=50", url += "&d=404", url);
        ctx = ctx.push(_.extend({}, user, {
          url: url
        }));
        return dust.render('avatar', ctx, function(err, html) {
          return c.write(html);
        });
      } else {
        return c;
      }
    };

    TemplateHelpers.prototype._deferred_script = function(script_text) {
      return "<script>      _.defer(function() {        " + script_text + "      });    </script>";
    };

    TemplateHelpers.prototype._data_attributes = function(options) {
      var attrs, key, value;
      attrs = '';
      for (key in options) {
        value = options[key];
        if (key !== 'name' && key !== 'label') {
          attrs += " data-" + key + "=\"" + value + "\"";
        }
      }
      return attrs;
    };

    return TemplateHelpers;

  })();

}).call(this);
}, "fe/util/underscore_plugins": function(exports, require, module) {(function() {

  _.mixin({
    flatMap: function(array, iterator, context) {
      return _.flatten(_.map(array, iterator, context), true);
    },
    eachSlice: function(arr, n, iterator) {
      var i, _i, _ref;
      for (i = _i = 0, _ref = Math.ceil(arr.length / n); 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
        iterator(arr.slice(i * n, (i + 1) * n));
      }
    },
    toUTC: function(date) {
      if (date) {
        return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds()));
      } else {
        return date;
      }
    },
    fromUTC: function(date) {
      if (date) {
        return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds());
      } else {
        return date;
      }
    }
  });

}).call(this);
}, "fe/visualizations/packed_circles": function(exports, require, module) {(function() {
  var _ref;

  if ((_ref = window.Visualization) == null) {
    window.Visualization = {};
  }

  Visualization.packed_circles = function(w, h) {
    if (w == null) {
      w = 400;
    }
    if (h == null) {
      h = 200;
    }
    return function(container, event) {
      var pack, r, vis, x, y;
      r = _.min([w, h]) * 1.25;
      x = d3.scale.linear().range([0, r]);
      y = d3.scale.linear().range([0, r]);
      pack = d3.layout.pack().size([r, r]).value(function(d) {
        return d.size;
      });
      vis = d3.select(container).insert("svg:svg").attr("width", w).attr("height", h).append("svg:g").attr("transform", "translate(" + (w - r) / 2 + "," + (h - r) / 2 + ")");
      return function(data) {
        var nodes, opacity, root, selected, visible_text, zoom;
        selected = root = data;
        visible_text = 50;
        opacity = function(d) {
          if (d.depth === selected.depth || d.depth === selected.depth + 1) {
            return 1;
          } else {
            return 0;
          }
        };
        nodes = pack.nodes(root);
        zoom = function(d) {
          var k, t;
          if (event) {
            event('zoom', d);
          }
          k = r / d.r / 2;
          x.domain([d.x - d.r, d.x + d.r]);
          y.domain([d.y - d.r, d.y + d.r]);
          t = vis.transition().duration(d3.event.altKey ? 7500 : 750);
          t.selectAll("circle").attr("cx", function(d) {
            return x(d.x);
          }).attr("cy", function(d) {
            return y(d.y);
          }).attr("r", function(d) {
            return k * d.r;
          });
          t.selectAll("text").attr("transform", function(d) {
            return "translate(" + (x(d.x)) + "," + (y(d.y)) + ")rotate(-10)";
          }).style("opacity", opacity);
          selected = d;
          return d3.event.stopPropagation();
        };
        vis.selectAll("circle").data(nodes).enter().append('circle').attr("class", function(d) {
          if (d.children) {
            return "parent";
          } else {
            return "child";
          }
        }).attr("cx", function(d) {
          return d.x;
        }).attr("cy", function(d) {
          return d.y;
        }).attr("r", function(d) {
          return d.r;
        }).on("click", function(d) {
          return zoom(selected === d ? root : d);
        });
        vis.selectAll("text").data(nodes).enter().append("svg:text").attr("class", function(d) {
          if (d.children) {
            return "parent";
          } else {
            return "child";
          }
        }).attr("dy", ".35em").attr("text-anchor", "middle").style("opacity", opacity).attr("transform", function(d) {
          return "translate(" + d.x + "," + d.y + ")rotate(-10)";
        }).text(function(d) {
          return d.name;
        });
        return d3.select(container).on("click", function() {
          return zoom(root);
        });
      };
    };
  };

}).call(this);
}, "fe/visualizations/partitioned": function(exports, require, module) {(function() {
  var _ref;

  if ((_ref = window.Visualization) == null) {
    window.Visualization = {};
  }

  Visualization.partitioned = function(w, h) {
    if (w == null) {
      w = 400;
    }
    if (h == null) {
      h = 800;
    }
    return function(container, event) {
      var partition, vis, x, y;
      x = d3.scale.linear().range([0, w]);
      y = d3.scale.linear().range([0, h]);
      vis = d3.select(container).append("svg:svg").attr("width", w).attr("height", h);
      partition = d3.layout.partition().value(function(d) {
        return d.size;
      });
      return function(root) {
        var click, g, kx, ky, transform;
        transform = function(d) {
          return "translate(8," + d.dx * ky / 2 + ")";
        };
        click = function(d) {
          var kx, ky, t;
          if (!d.children) {
            return;
          }
          if (event) {
            event('zoom', d);
          }
          kx = (d.y ? w - 40 : w) / (1 - d.y);
          ky = h / d.dx;
          x.domain([d.y, 1]).range([(d.y ? 40 : 0), w]);
          y.domain([d.x, d.x + d.dx]);
          t = g.transition().duration(d3.event.altKey ? 7500 : 750).attr("transform", function(d) {
            return "translate(" + x(d.y) + "," + y(d.x) + ")";
          });
          t.select("rect").attr("width", d.dy * kx).attr("height", function(d) {
            return d.dx * ky;
          });
          t.select("text").attr("transform", transform).style("opacity", function(d) {
            if (d.dx * ky > 12) {
              return 1;
            } else {
              return 0;
            }
          });
          return d3.event.stopPropagation();
        };
        g = vis.selectAll("g").data(partition.nodes(root)).enter().append("svg:g").attr("transform", function(d) {
          return "translate(" + x(d.y) + "," + y(d.x) + ")";
        }).on("click", click);
        kx = w / root.dx;
        ky = h / 1;
        g.append("svg:rect").attr("width", root.dy * kx).attr("height", function(d) {
          return d.dx * ky;
        }).attr("class", function(d) {
          if (d.children) {
            return "parent";
          } else {
            return "child";
          }
        });
        g.append("svg:text").attr("transform", transform).attr("dy", ".35em").style("opacity", function(d) {
          if (d.dx * ky > 12) {
            return 1;
          } else {
            return 0;
          }
        }).text(function(d) {
          return d.name;
        });
        return d3.select(window).on("click", function() {
          return click(root);
        });
      };
    };
  };

}).call(this);
}});
