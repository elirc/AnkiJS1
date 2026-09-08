"""Original beginner lessons. Each lesson teaches one idea in several ways.
The two cards per lesson ask for understanding and application; they are siblings.
Run this, then build-curriculum.py. No model service or network is needed.
"""
from pathlib import Path
import runpy
import hashlib
import json

CRUD = runpy.run_path(str(Path(__file__).with_name('crud_lessons.py')))
LESSONS = []
def add(key, title, aliases, question, plain, analogy, example, mistake, check, answer):
    LESSONS.append(dict(key=key, title=title, aliases=aliases.split('|'), question=question,
                        plain=plain, analogy=analogy, example=example, mistake=mistake, check=check, answer=answer))

# 01 — Read your first program
add('values', 'Values and expressions', 'expression|literal|value',
    'What is the difference between a value and an expression?',
    'A value is a piece of data, such as the number 7 or the text "hello". An expression is a piece of code that produces a value. The computer evaluates an expression by doing its operations and obtaining a result. A single value can also be an expression.',
    'Think of a value as a finished sandwich. An expression is an instruction such as "combine these ingredients." Its result is another value. The analogy describes producing a result; code can also produce results that are not physical objects.',
    '```js\n2 + 3       // 5\n"hi"        // "hi"\n10 > 4      // true\n```\n\nRead each line as "what value does this produce?" Addition produces a number. Quoted text produces a string. A comparison produces a yes-or-no value called a boolean.',
    'Do not assume every line produces a useful result you can use elsewhere. A statement can organize work, such as an if block. Learning to identify expressions helps you understand what can be assigned to a variable or passed to a function.',
    'What value does `(2 + 3) * 4` produce, and why?',
    'It produces **20**. Parentheses make the computer evaluate 2 + 3 first, giving 5. It then multiplies 5 by 4. Without the parentheses, multiplication normally happens before addition.')
add('variables', 'Variables', 'variable|let|const|reassign',
    'What is a variable, in everyday language?',
    'A variable is a name you use to refer to a value. It lets you remember data and use it again without repeating the data itself. In JavaScript, let allows that name to be assigned a different value later. const prevents reassignment of the name.',
    'Imagine a labeled slot on a whiteboard. The label is the variable name; the number written beside it is its current value. Updating the number changes what the label refers to. Objects need a little more care: their contents can change even when the label stays fixed.',
    '```js\nlet score = 2;\nscore = score + 3;\nconsole.log(score); // 5\n```\n\nFirst, score refers to 2. Next, the right side reads that old 2 and adds 3. Only then is the new value, 5, assigned to score.',
    'const does not freeze an object. `const user = {name: "Ada"}` prevents replacing user with another object, but `user.name = "Jo"` can still change the existing object.',
    'What does this print?\n\n```js\nlet total = 4;\nconst earlier = total;\ntotal = 9;\nconsole.log(earlier);\n```',
    'It prints **4**. earlier received the number stored in total at that moment. It is not a formula that automatically rereads total when total changes.')
add('strings', 'Text and strings', 'string|strings|text|concatenate|substring',
    'Why do programmers put quotation marks around text?',
    'Quotation marks tell the language that the enclosed characters are text, called a string. Without quotes, a word usually names a variable or has a special meaning in the language. The quotes mark where the string starts and ends; they are not normally part of its contents.',
    'Compare a written label saying "door" with an instruction to find the object named door. Quotes tell the program to use the label itself. This is about distinguishing data from names, not about whether the text has meaning to a person.',
    '```js\nconst name = "Ada";\nconsole.log("Hello " + name); // Hello Ada\nconsole.log("name");         // name\n```\n\nThe first log combines two pieces of text. The second uses the literal letters n-a-m-e rather than looking up the name variable.',
    'The plus sign can join strings instead of doing arithmetic. `"2" + 3` produces the string "23" in JavaScript. Convert input deliberately when you intend to calculate with numbers.',
    'What does `"cat".toUpperCase()` produce? Does the original string change?',
    'It produces a **new string, "CAT"**. JavaScript strings are immutable: this method returns different text rather than changing the original string in place. Save the returned value if you need it later.')
add('types', 'Data types', 'data type|typeof|type coercion|number|boolean',
    'What does a data type tell you about a value?',
    'A type describes the kind of data and what operations make sense for it. Numbers support arithmetic, strings represent text, and booleans represent true or false. JavaScript can convert between types automatically in some operations, which is why knowing the input types matters.',
    'A kitchen distinguishes water, flour, and a measuring cup. You handle each differently even if they are all on the same counter. A data type is a similar clue about how a value behaves; it is not always a guarantee that the value is valid for your task.',
    '```js\ntypeof 7       // "number"\ntypeof "7"     // "string"\ntypeof true    // "boolean"\nNumber("7") + 2 // 9\n```\n\nThe digit inside quotes is text. Number explicitly asks for a numeric conversion before addition.',
    'A value can have the right type and still be invalid. A negative age is a number, but probably not a valid age. Validate the rules of your application as well as the basic type.',
    'A form gives you the string "12". Why might `input + 1` produce "121"?',
    'Because input is text, JavaScript uses string concatenation here. Convert it to a number first and check that conversion succeeded. `Number("12") + 1` produces 13; not every string can be converted to a useful number.')
add('assignment', 'Assignment versus comparison', 'assignment|strict equality|===|==|equality',
    'What is the difference between = and === in JavaScript?',
    'A single equals sign assigns a value to a name or property. Three equals signs compare two values and produce true or false without doing type conversion. These are different actions: one changes or sets something, while the other asks a question.',
    'Assignment is writing a new score on a scoreboard. Comparison is asking whether the score is 10. Asking the question should not itself change the score. The symbols look similar, so read the intended action aloud.',
    '```js\nlet score = 3;\nscore = 5;          // set it to 5\nscore === 5;        // true\nscore === "5";      // false\n```\n\nThe last comparison is false because a number and a string are different types under strict equality.',
    'Using `if (score = 5)` assigns 5 rather than comparing. The resulting value is truthy, so the branch runs. Prefer clear comparisons and use a linter to catch accidental assignments in conditions.',
    'What does this print?\n\n```js\nlet count = 2;\nconsole.log(count === 3);\nconsole.log(count);\n```',
    'It prints **false**, then **2**. The comparison asks a question and returns a boolean. It does not assign 3 to count.')
add('conditions', 'Making a decision with if', 'if statement|conditional|condition|else|ternary',
    'How does an if / else statement choose what to do?',
    'The program evaluates a condition. If that condition is true, it runs the if branch. Otherwise it runs the else branch, if one exists. In a single if/else pair, only one branch runs. This lets the same program react differently to different inputs.',
    'Think of a fork in a walking path with a sign: "If the bridge is open, go left; otherwise, go right." You check the sign once at the fork and take one path. Separate if statements are separate decisions, so several can run.',
    '```js\nconst age = 17;\nif (age >= 18) {\n  console.log("Adult");\n} else {\n  console.log("Under 18");\n}\n```\n\n17 is not at least 18, so the condition is false and the second message is printed.',
    'Check the boundary. `age > 18` excludes someone who is exactly 18, while `age >= 18` includes them. Small symbol differences can change the business rule.',
    'A discount applies when the total is at least 50. Should the condition be `total > 50` or `total >= 50`?',
    'Use **total >= 50**. "At least" includes the boundary value itself. Test 49, 50, and 51 to check the rule on both sides and exactly at the cutoff.')
add('missing', 'Missing values: null and undefined', 'null|undefined|nullish|optional chaining',
    'What is the basic difference between null and undefined in JavaScript?',
    'Both can represent missing information. undefined commonly means a value has not been supplied, such as a missing object property. null is often an explicit choice meaning "there is no value here." The exact meaning is a convention your application should define.',
    'An unanswered form field resembles undefined. A field explicitly marked "not applicable" resembles null. Both lack an ordinary value, but they can communicate different reasons. This analogy is a convention, not a rule enforced by every program.',
    '```js\nconst user = { nickname: null };\nuser.nickname; // null\nuser.city;     // undefined\nuser.nickname ?? "Guest"; // "Guest"\n```\n\nThe nullish operator ?? chooses the fallback only for null or undefined. It preserves meaningful values such as 0 and an empty string.',
    'Do not assume a missing property can be used like a full object. Accessing `user.address.city` fails if address is undefined. `user.address?.city` safely gives undefined when address is absent, but you still need to decide how to handle that absence.',
    'What does `0 ?? 10` produce, and why?',
    'It produces **0**. The fallback is used only for null or undefined. Zero is a real numeric value, even though it is falsy in other contexts such as the || operator.')
add('truthy', 'Truthy and falsy values', 'truthy|falsy|logical operator|short-circuit',
    'What does truthy mean in a JavaScript condition?',
    'JavaScript can treat a non-boolean value as true or false when making a decision. A truthy value is treated as true in that context. Common falsy values include false, 0, the empty string, null, undefined, and NaN. Arrays and ordinary objects are truthy, even when empty.',
    'Imagine a gate that converts several kinds of tickets into a simple yes or no. That conversion is useful, but a yes does not mean the ticket contains everything your application needs. An empty array passes this gate, for example.',
    '```js\nBoolean("");   // false\nBoolean("0");  // true\nBoolean([]);   // true\n```\n\nThe string "0" contains a character, so it is truthy. An empty array is still an object; its truthiness does not tell you whether it contains items.',
    'Do not use `if (items)` to check whether an array has entries. Use a length check such as `items.length > 0`, after ensuring items is actually an array.',
    'Why does `if ([])` enter its branch, even though the array is empty?',
    'Because **an array is truthy regardless of its length**. Truthiness asks how the value converts to a boolean; it does not perform a "has items" check.')

# 02 — Follow the flow
add('loops', 'Loops', 'loop|iteration|for loop|while loop',
    'Why use a loop instead of copying the same line many times?',
    'A loop repeats a piece of work while a condition holds or while there are more items to visit. You describe the repeated action once. The program can then handle a list of any suitable size, including a size you do not know when writing the code.',
    'Imagine checking each ticket in a queue. The action stays the same: inspect one ticket, then move to the next person. The loop provides that movement. Without progress toward the end, you would keep inspecting the same ticket forever.',
    '```js\nfor (const name of ["Ada", "Lin"]) {\n  console.log("Hi " + name);\n}\n```\n\nOn the first pass, name is "Ada". On the second, it is "Lin". After the last item, the loop ends. A single pass is called an iteration.',
    'Every loop needs a believable way to finish. In a while loop, make sure something changes so the condition can eventually become false. An accidental infinite loop can freeze the page.',
    'How many times does this run?\n\n```js\nfor (let i = 0; i < 3; i++) {\n  console.log(i);\n}\n```',
    'It runs **three times**, printing 0, 1, and 2. After i becomes 3, the condition i < 3 is false. The loop tests the condition before starting each pass.')
add('functions', 'Functions', 'function|function call|method',
    'What is a function, and what does calling it mean?',
    'A function is a named or reusable piece of work. Defining it describes what should happen. Calling it asks the program to do that work now, using the supplied inputs. A function can return a result, change something, or do both, depending on its design.',
    'A recipe describes steps; cooking from the recipe performs them. Writing a function is like writing the recipe. Calling it is like preparing one meal. Each call can use different ingredients, which correspond to its inputs.',
    '```js\nfunction double(number) {\n  return number * 2;\n}\nconst result = double(4); // 8\n```\n\nThe definition does not double anything on its own. The call passes 4 in, executes the multiplication, and stores the returned 8 in result.',
    'Referring to a function and calling it are different. `double` refers to the function itself. `double(4)` calls it. Passing a function to an event handler usually means supplying the function, not running it immediately.',
    'What is stored in result?\n\n```js\nfunction greet(name) {\n  return "Hi " + name;\n}\nconst result = greet("Sam");\n```',
    'The string **"Hi Sam"**. The argument "Sam" becomes the value of the parameter name inside this call. return sends the combined string back to the caller.')
add('parameters', 'Parameters and arguments', 'parameter|argument|default parameter|rest parameter',
    'How are a parameter and an argument different?',
    'A parameter is the name used for an input in a function definition. An argument is the actual value supplied in a call. The parameter acts like a local name for that value while the function is running. This allows the function to work with many different inputs.',
    'A recipe may say "use the chosen fruit." That placeholder is a parameter. The apple you bring to the kitchen is an argument. Different calls can supply different fruit without rewriting the recipe.',
    '```js\nfunction add(a, b) {\n  return a + b;\n}\nadd(2, 5); // 7\nadd(8, 1); // 9\n```\n\nThe parameters are a and b. The first call supplies the arguments 2 and 5. The second call gives those same parameter names different values.',
    'Argument order matters for positional parameters. A function expecting width then height receives values in that order, regardless of what you intended. Named fields in an options object can make long lists of arguments easier to read.',
    'In `function square(x) { return x * x; }` followed by `square(6)`, which part is the argument?',
    '**6** is the argument. x is the parameter name in the definition. During that call, x refers to 6, so the function returns 36.')
add('return', 'Returning a result', 'return|return value|console.log',
    'Why is returning a value different from printing it?',
    'Returning sends a result back to the caller so other code can use it. Printing writes something to a console or display for a person to see. Printing a value does not automatically make it the function result. In JavaScript, a function with no explicit return value returns undefined.',
    'A cashier saying your change aloud is like printing. Actually handing you the change is like returning. Other code needs the returned value if it is going to use the result in its own calculation.',
    '```js\nfunction add(a, b) {\n  return a + b;\n}\nconst total = add(2, 3);\nconsole.log(total * 2); // 10\n```\n\nBecause add returns 5, the caller can multiply it. A console message inside add would not by itself provide total with 5.',
    'Code after a return in the same execution path does not run. Also, an arrow function with braces needs an explicit return for a result: `x => { return x * 2; }` differs from `x => { x * 2; }`.',
    'What is result here?\n\n```js\nfunction demo() {\n  console.log(5);\n}\nconst result = demo();\n```',
    '**undefined**. The console displays 5, but demo never returns that value. To make result equal 5, the function needs to return 5.')
add('scope', 'Scope', 'scope|block-scoped|global variable|local variable',
    'What does the scope of a variable mean?',
    'Scope is the part of the program where a name is available. A local variable belongs to a smaller area, such as a function or block. Code outside that area cannot normally access it directly. Keeping names local helps unrelated parts of the program avoid interfering with each other.',
    'A name on a classroom attendance sheet is meaningful inside that class. A school-wide directory has wider reach. Scope tells you which "directory" the program searches for a name. Inner code can often read names from its surrounding scope.',
    '```js\nfunction greet() {\n  const message = "Hello";\n  return message;\n}\ngreet(); // "Hello"\n// message is not available here\n```\n\nThe caller receives the returned string. It does not gain access to the function\'s private variable name.',
    'A name reused inside an inner scope can hide an outer name. This is called shadowing. If a value seems unexpected, inspect which declaration the current code is actually using.',
    'Can code outside this block read count?\n\n```js\nif (true) {\n  const count = 3;\n}\n```',
    '**No.** count is block-scoped. The surrounding code cannot use that declaration after the closing brace. Declare a value in an appropriate outer scope if it must be used there.')
add('callbacks', 'Callbacks', 'callback|higher-order|higher order',
    'What is a callback, without the jargon?',
    'A callback is a function you give to another function so that it can call yours when needed. You provide a little piece of behavior, while the other function controls when to use it. A callback may run immediately during a loop or later after an event; the word alone does not mean asynchronous.',
    'You leave a set of instructions with a helper: "For every parcel, write its address here." The helper decides when each parcel is ready, then follows your instructions. The instructions are the callback.',
    '```js\nconst numbers = [1, 2, 3];\nconst doubled = numbers.map(n => n * 2);\n// [2, 4, 6]\n```\n\nThe small function n => n * 2 is passed to map. map calls it for each present item and collects the returned values into a new array.',
    'Do not confuse passing a callback with invoking it yourself. `onClick={handleClick}` gives React a function to call later. `onClick={handleClick()}` runs it during rendering and passes its result instead.',
    'Is every callback asynchronous?',
    '**No.** The callback given to array map normally runs synchronously while map is working. A timer callback runs later. You must look at the API receiving the callback to understand the timing.')
add('closures', 'Closures', 'closure|lexical|captured|capture variable',
    'How can a function remember a variable from where it was created?',
    'A function can keep access to names in its surrounding scope, even after the outer function has finished. This combination of a function and access to its surrounding variables is called a closure. It is useful for keeping related state private and for creating customized functions.',
    'Imagine giving someone a key to a particular cupboard. The key continues to open that cupboard after you leave the room. A closure keeps access to the relevant variables; it does not necessarily take a frozen photograph of their values.',
    '```js\nfunction makeCounter() {\n  let count = 0;\n  return () => ++count;\n}\nconst next = makeCounter();\nnext(); // 1\nnext(); // 2\n```\n\nThe returned function keeps access to count. Both calls use the same variable from that call to makeCounter.',
    'A closure can observe a variable changing, so do not assume it always remembers the value from the first moment. In UI code, also consider which render created a callback and which values that render captured.',
    'If you call makeCounter() twice, do the two returned counters share the same count?',
    '**No.** Each call creates its own local count. Each returned function closes over the variable from its own call. Calling the first counter does not increment the second counter\'s variable.')
LESSONS.append(CRUD['GUARD'])

add('arrays', 'Arrays and positions', 'array|arrays|list|index|slice',
    'What is an array, and why is its first position usually zero?',
    'An array holds an ordered collection of values. You can find an item by its position, called an index. JavaScript starts positions at zero, so an array with three items uses indexes 0, 1, and 2. The length is the number of items, not the index of the last one.',
    'Picture a row of numbered lockers. You use a locker number to find one item. JavaScript numbers the first locker zero. The analogy helps with positions, but arrays can grow and can hold different types of values.',
    '```js\nconst colors = ["red", "green", "blue"];\ncolors[0];     // "red"\ncolors[2];     // "blue"\ncolors.length; // 3\n```\n\nFor a nonempty ordinary array, the last position is length - 1. A position past the end usually gives undefined rather than a useful item.',
    'Do not confuse length with the last valid index. For three items, colors[3] is past the end. Also remember that removing an item can move later items to different positions.',
    'What is `items[items.length - 1]` for `const items = [10, 20, 30]`?',
    '**30.** The length is 3, so the expression accesses index 2. That is the third and last item. For an empty array, this pattern does not produce a useful last item.')
add('map', 'Transforming with map', '.map|Array.prototype.map|mapping|transform each',
    'What does array map do in plain English?',
    'map builds a new list by transforming each present item in an existing list. You supply a small function describing the transformation. For each item, map uses the value your function returns as the corresponding item in the new list.',
    'Imagine a conveyor belt passing plain mugs through a painting station. Each incoming mug produces one painted mug. map is good when you want one transformed result per item; it is not the tool for deciding which mugs to throw away.',
    '```js\nconst prices = [2, 5, 8];\nconst doubled = prices.map(price => price * 2);\n// doubled: [4, 10, 16]\n// prices:  [2, 5, 8]\n```\n\nFollow the first item: 2 goes into the small function, which returns 4. Then 5 becomes 10, and 8 becomes 16.',
    'The callback must return the new value. With braces, write an explicit return. `prices.map(p => { p * 2; })` produces undefined entries. map creates a new array, but your callback can still mutate objects if you write it that way.',
    'What does `[1, 3, 5].map(n => n + 1)` produce?',
    '**[2, 4, 6].** Each number is transformed independently by adding one. The result has one item for every present item in the original array, in the same order.')
add('filter', 'Keeping items with filter', '.filter|Array.prototype.filter|filtering|predicate',
    'What does array filter do, and what should its callback return?',
    'filter makes a new list containing the items that pass your test. For each item, your callback returns a value treated as true or false. True means keep this item; false means leave it out. The kept items remain in their original order.',
    'Think of a ticket checker at an entrance. Each person is either admitted or turned away according to a rule. The checker does not transform people into different people. Use map when you want transformation instead.',
    '```js\nconst ages = [12, 20, 17, 30];\nconst adults = ages.filter(age => age >= 18);\n// [20, 30]\n```\n\n12 fails the test. 20 passes. 17 fails. 30 passes. The result contains the original values that passed.',
    'Returning a transformed number from filter does not put that number in the result. It is only used as a keep-or-drop decision. If you need filtering and transformation, make both steps explicit.',
    'What does `[0, 1, 2, 3].filter(n => n > 1)` produce?',
    '**[2, 3].** Only those two values make the condition true. Zero and one are left out. filter does not change the surviving values.')
add('reduce', 'Building a result with reduce', '.reduce|Array.prototype.reduce|accumulator|reduction',
    'What is the accumulator in a reduce operation?',
    'The accumulator is the result you are building as you walk through a list. Each step receives that running result and the current item, then returns the running result for the next step. You choose an initial value that makes sense, such as zero for a sum.',
    'A cashier adds prices to a running total. The running total is the accumulator. After each item, the updated total is handed to the next step. The accumulator can also be an object or another collection, not only a number.',
    '```js\n[2, 3, 4].reduce((total, n) => total + n, 0);\n// 9\n```\n\nStart with total = 0. Add 2 to get 2. Add 3 to get 5. Add 4 to get 9. The final running result becomes the return value.',
    'If you omit the initial value, JavaScript uses the first present item as the starting result. That changes which callbacks run, and an empty array without an initial value throws an error. Be deliberate about the initial value.',
    'What does `[2, 3].reduce((total, n) => total + n, 10)` return?',
    '**15.** The starting accumulator is 10, not zero. The first step adds 2, producing 12. The second adds 3, producing 15.')
add('objects', 'Objects and named properties', 'object|property|properties|dictionary|key-value',
    'How is an object different from an array?',
    'An object groups values under named properties. An array is usually used for an ordered list of items. Use an object when names such as title, price, and inStock describe different parts of one thing. You can read or update a property using its name.',
    'An object resembles a contact card with labeled fields for name, phone, and email. An array resembles an ordered stack of contact cards. The distinction is about how you intend to organize and access the data.',
    '```js\nconst book = { title: "Loops", pages: 120 };\nbook.title;       // "Loops"\nbook["pages"];    // 120\nconst field = "title";\nbook[field];      // "Loops"\n```\n\nDot notation names a property directly. Brackets let you use a computed property name stored in a variable.',
    '`book.field` looks for a property literally named field. It does not use the value of the variable field. Use `book[field]` for that. Also distinguish a missing property from a property intentionally containing null.',
    'What does `user[key]` produce when `user = {name: "Ada"}` and `key = "name"`?',
    '**"Ada".** The brackets evaluate key first, giving "name", then read that property from user. `user.key` would instead look for a property named key.')
add('references', 'Shared object references', 'reference|aliasing|shared object|identity',
    'Why can changing an object through one variable affect another variable?',
    'Two variables can refer to the same object. Assigning one object variable to another usually copies the reference, not all the object contents. A change through either reference changes the one shared object, so both variables can observe it.',
    'Two people can have the same shared document bookmarked. Changing the document through one bookmark changes what the other person sees. Copying the bookmark is not the same as copying the document.',
    '```js\nconst first = { score: 1 };\nconst second = first;\nsecond.score = 9;\nconsole.log(first.score); // 9\n```\n\nThere is one object and two names referring to it. No new object was created by the second line.',
    'Creating a new outer object does not automatically copy nested objects. `{...first}` is a shallow copy. Decide whether you need a new outer object, new nested objects, or an explicit deep-copy operation suitable for the data.',
    'What does this print?\n\n```js\nconst a = { n: 1 };\nconst b = { n: 1 };\nconsole.log(a === b);\n```',
    '**false.** a and b refer to two different objects. Their properties happen to contain equal numbers, but strict equality on objects checks identity rather than comparing every property.')
add('sets', 'Sets and unique values', 'Set|unique|deduplicate|duplicate values',
    'When is a Set useful?',
    'A Set stores each distinct value at most once. It is useful when you care about membership or uniqueness, such as whether an ID has already been seen. You can add values, test whether they are present, and remove them.',
    'Imagine a guest list where each name is checked off only once. Adding the same entry again does not create another seat. For objects, JavaScript distinguishes separate object identities, even if their visible contents look the same.',
    '```js\nconst seen = new Set(["a", "b", "a"]);\nseen.size;     // 2\nseen.has("a"); // true\n[...seen];     // ["a", "b"]\n```\n\nThe repeated string "a" does not become a second entry. Spreading the Set creates an array of its values.',
    'A Set does not automatically merge objects with equal-looking properties. Two separately created `{id: 1}` objects are different identities. To deduplicate records by ID, use their IDs as keys.',
    'How many values are in `new Set([1, 1, 2, 2, 3])`?',
    '**Three.** The distinct values are 1, 2, and 3. Repeated additions of those same numeric values do not increase the Set\'s size.')
add('sorting', 'Sorting with a comparison function', '.sort|sorting|comparator|sort order',
    'Why does JavaScript sometimes need a comparison function to sort numbers?',
    'By default, array sort compares string forms of values. That can put 10 before 2. A numeric comparison function tells it which number should come first. Returning a negative number puts a before b; positive puts a after b; zero means they compare equally.',
    'Alphabetizing labels reading "10" and "2" is different from arranging quantities from small to large. A comparison function tells the sorter which kind of ordering you actually intend.',
    '```js\nconst numbers = [10, 2, 1];\nnumbers.sort((a, b) => a - b);\n// [1, 2, 10]\n```\n\nFor a = 2 and b = 10, a - b is negative, so 2 belongs before 10. The function compares pairs; it does not directly return the whole sorted array.',
    'sort changes the array it is called on. If the original order must remain available, sort a copy, such as `[...numbers].sort(...)`, or use a suitable non-mutating API supported by your environment.',
    'What is the result of `[3, 12, 1].sort((a, b) => a - b)`?',
    '**[1, 3, 12].** Subtracting b from a gives the comparison rule for ascending numeric order. Using b - a would reverse the direction.')

# 04 — Understand time and failures
add('promises', 'Promises', 'Promise|promises|then|resolve|reject',
    'What does a Promise represent?',
    'A Promise represents the eventual result of work that may finish later. It starts pending and then becomes fulfilled with a value or rejected with a reason. It lets your code describe what to do with that eventual outcome without pretending the value is already available.',
    'A collection ticket for a prepared order is not the order itself. It represents a result you will receive later or a failure to deliver it. A Promise is similar, except its state changes only once from pending to a settled outcome.',
    '```js\nconst result = Promise.resolve(5);\nresult.then(value => console.log(value));\n```\n\nresult is a Promise. The callback receives the resolved value, 5. Even for an already fulfilled Promise, the then callback is scheduled rather than called inline at that exact line.',
    'Do not treat a Promise like the value it will eventually provide. Also handle rejection. A successful network connection does not guarantee the server returned the application result you expected.',
    'Does `const user = fetch("/user")` immediately give you a parsed user object?',
    '**No.** fetch returns a Promise for a Response. You need to await or handle that response, check it as appropriate, and then parse its body, for example with response.json().')
add('await', 'Reading async and await', 'async|await|asynchronous',
    'Does await pause the whole program?',
    'await pauses the continuation of the current async function until the awaited value settles. It does not normally freeze the whole browser while waiting for asynchronous work. An async function returns a Promise, so its caller also needs to handle an eventual result.',
    'You order food and let the rest of the café keep working while you wait. Your own next step, eating, waits for the meal. That is the useful idea behind await. It does not move heavy calculations to another worker automatically.',
    '```js\nasync function load() {\n  const response = await fetch("/user");\n  if (!response.ok) throw new Error("Request failed");\n  return await response.json();\n}\n```\n\nFirst wait for a response. Then check its status. Then wait for the body to be parsed. Errors can reject the returned Promise.',
    'Putting async before a CPU-heavy function does not make its calculations non-blocking. Long synchronous work before the next await still blocks its thread. Workers or smaller chunks may be needed.',
    'If two independent requests are awaited one after the other, when does the second request start?',
    'If you call the second fetch only after the first await, it starts **after the first finishes**. To overlap independent work, start both operations first and then await their results, often with Promise.all.')
add('event-loop', 'The event loop', 'event loop|microtask|setTimeout|task queue',
    'Why does a timer callback run after the current code finishes?',
    'JavaScript on a typical browser main thread runs the current piece of synchronous work before taking another queued callback. A timer makes a callback eligible to run later. It does not interrupt the current function in the middle. This ordering explains many surprising console outputs.',
    'A clerk finishes the current customer before taking the next waiting ticket. A timer adds work to a later queue; it does not push the current customer out of the way. Browser scheduling has several queues, so this is a simplified picture.',
    '```js\nconsole.log("A");\nsetTimeout(() => console.log("B"), 0);\nconsole.log("C");\n// A, C, B\n```\n\nThe current work prints A and C. The callback prints B only after the current synchronous work has completed.',
    'A zero-millisecond timer does not mean "run immediately" or "run at an exact time." Busy work and scheduling can delay it. Promise continuations also have different queue priority from ordinary timer tasks.',
    'What order is logged?\n\n```js\nconsole.log(1);\nPromise.resolve().then(() => console.log(2));\nconsole.log(3);\n```',
    '**1, 3, 2.** The synchronous statements run first. The Promise callback runs as a microtask after the current synchronous work completes.')
add('errors', 'Errors and exceptions', 'throw|try|catch|exception|error handling',
    'What do try and catch help a program do?',
    'A try block contains work that might throw an exception. If it does, execution jumps to the matching catch block, where you can handle the failure. This lets you respond deliberately instead of continuing as if the operation succeeded.',
    'Imagine a normal route through a building with an emergency exit. An exception takes the emergency route. The catch block decides what happens next. It should not quietly pretend the destination was reached if the work actually failed.',
    '```js\ntry {\n  JSON.parse("not valid JSON");\n} catch (error) {\n  console.log("Please check the input");\n}\n```\n\nParsing fails, so control moves to catch. Code after the failing expression inside the try block would be skipped.',
    'A catch block that does nothing can hide bugs and leave callers believing an operation succeeded. Recover meaningfully, report the failure, or rethrow it. Async failures need to be awaited or handled through the Promise chain.',
    'Will `try { fetch("/data"); } catch (...) { ... }` catch a later Promise rejection from fetch?',
    '**Not by itself.** The rejection happens through the Promise after fetch returns. Await the Promise inside an async try block, or attach an appropriate rejection handler.')
add('debugging', 'Debugging step by step', 'debug|debugging|breakpoint|stack trace',
    'What should you do first when a program behaves unexpectedly?',
    'Make the problem repeatable and state the difference between the expected and actual result. Then inspect the relevant inputs and follow the code in small steps. A useful debugging step answers a specific question rather than changing several things and hoping the problem disappears.',
    'A detective checks clues against a theory. If the theory predicts a value should be 10, inspect that value. Evidence that it is 3 narrows the search. Random edits are like moving furniture before recording the scene.',
    'Suppose a total is too large.\n\n1. Write down the expected total for two known items.\n2. Inspect the actual items passed in.\n3. Check whether an item appears twice.\n4. Inspect the running total after each addition.\n\nA breakpoint can pause execution so you can inspect these values directly.',
    'Fixing the visible symptom without understanding the cause often creates another bug. After finding the cause, make a small correction and add a focused check for the situation that exposed it.',
    'A function returns 12 when you expected 7. Is changing the final result to `result - 5` a good first fix?',
    '**No.** It fits one observation without explaining the error. Inspect the inputs and intermediate steps first. The real problem might be duplicate data, string conversion, or an incorrect formula.')
add('tests', 'Tests as executable examples', 'test|testing|assert|assertion|unit test',
    'What is a useful automated test?',
    'A test supplies a known situation, performs an action, and checks an expected outcome. It turns an example of correct behavior into something the computer can repeat. A useful test fails when an important behavior is wrong, not merely when internal formatting changes.',
    'A test is like a small checklist a machine can carry out exactly. The checklist needs an actual expected result. "Turn the machine on" checks less than "turn it on and verify that the light becomes green."',
    'For an add function, a simple test is:\n\n- Input: 2 and 3.\n- Action: call add(2, 3).\n- Expected result: 5.\n\nThen add examples that explore real boundaries, such as zero or negative values, if those are allowed inputs.',
    'A test that repeats the same formula as the implementation can repeat the same mistake. Use independently understandable examples or meaningful properties. Do not mock away the very behavior you intend to verify.',
    'A discount starts at 100. Which three totals make a useful boundary test?',
    '**99, 100, and 101.** They check below the cutoff, exactly at the cutoff, and above it. The expected result at 100 must match whether the rule means "at least 100" or "more than 100."')
add('validation', 'Checking input', 'validation|validate|untrusted|invalid input',
    'Why must a server validate input even when a form already checks it?',
    'The form is only one way to call the server. A caller can bypass it, modify a request, or use a different client. The server must enforce the rules it depends on, such as required fields, allowed values, and maximum sizes.',
    'A sign asking visitors to bring tickets is helpful, but the entrance still needs a ticket check. Client-side validation is the sign; server-side validation protects the actual boundary. Neither replaces checking what a particular user is allowed to do.',
    'For a quantity field, check more than "it is a number":\n\n1. Is it present?\n2. Is it an integer?\n3. Is it within the allowed range?\n4. Is this user allowed to order that quantity?\n\nEach question protects a different rule.',
    'Validation and authorization are different. A perfectly formatted record ID might belong to someone else. Check both whether the input is valid and whether the caller has permission for the operation.',
    'A client sends quantity = -3. The value is a number. Is that enough to accept it?',
    '**No.** The server also needs the domain rule, such as a positive whole-number quantity within an allowed maximum. A correct basic type does not make the value valid for the business operation.')
add('logs', 'Useful logs', 'log|logging|observability|request ID|trace ID',
    'What information makes a log useful when investigating a problem?',
    'A useful log says what happened and gives enough context to connect it to the operation being investigated. That may include an event name, a request ID, an outcome, and a safe error summary. It should help answer a question without exposing private data or secrets.',
    'Imagine a parcel tracking history. "Something happened" is not very useful. "Parcel 42 left the sorting center at 09:10" lets you follow a particular journey. A request ID plays a similar connecting role across application events.',
    'Compare these messages:\n\n- Weak: "failed".\n- More useful: "order_save_failed; request=abc123; reason=database_timeout".\n\nThe second gives you an operation to investigate and a way to connect other events. Avoid putting payment details, passwords, or tokens in the message.',
    'More logs do not automatically mean better visibility. Repeated noise can hide the signal and increase costs. Log meaningful boundaries and failures, and choose metrics or traces for questions they answer better.',
    'Should you log a user\'s password to diagnose a failed login?',
    '**No.** Log a safe failure category and correlation information instead. Passwords and tokens can spread through log storage, dashboards, and backups, making the exposure much harder to contain.')

# 05 — Understand a web page
add('html', 'HTML gives a page structure', 'HTML|semantic|heading|element|markup',
    'What job does HTML do on a web page?',
    'HTML describes the structure and meaning of page content: headings, paragraphs, links, buttons, and forms. The browser reads that structure and creates a document it can display and interact with. CSS controls much of the appearance; JavaScript can add behavior.',
    'Think of a document outline with labels such as title, paragraph, and footnote. Those labels tell readers what each part is for. HTML does a similar job for browsers and assistive tools; choosing a tag only for its default appearance misses that meaning.',
    '```html\n<h1>My recipes</h1>\n<p>Choose something to cook.</p>\n<a href="/recipes">Browse recipes</a>\n```\n\nThe heading names the page. The paragraph gives context. The link has a destination that a browser can navigate to.',
    'A clickable div is not automatically equivalent to a button. Real buttons come with useful keyboard and semantic behavior. Prefer the element that expresses the job, then style it as needed.',
    'Should a control that submits a form normally be a button or a paragraph with a click handler?',
    'A **button**. It expresses an action and supports expected interaction patterns. Set its type appropriately; inside a form, a button defaults to submitting unless you choose another type.')
add('css', 'CSS rules and selectors', 'CSS|selector|stylesheet|specificity|cascade',
    'How does a CSS rule decide which elements to style?',
    'A rule has a selector and declarations. The selector describes which elements match. The declarations set visual properties for those matches, such as color or spacing. When several rules compete, the cascade decides which declarations win using factors including origin, importance, layers, specificity, and order.',
    'Imagine an instruction saying "give everyone wearing a blue badge a green folder." The badge description is the selector; the green-folder instruction is the declaration. CSS rules can overlap, so there must also be rules for resolving competing instructions.',
    '```css\n.notice {\n  color: green;\n  padding: 12px;\n}\n```\n\nThe dot means a class selector. Elements with class="notice" receive the matching styles. Padding adds space inside the element around its content.',
    'Do not immediately add !important whenever a style loses. Inspect which rule is winning and why. Repeated overrides make later changes difficult to predict.',
    'What does the selector `.warning` match: an element named warning, or elements with class="warning"?',
    'It matches **elements with the warning class**. A dot introduces a class selector. A selector written simply as `warning` would target elements with that tag name.')
add('dom', 'The DOM', 'DOM|document.querySelector|node|document object',
    'What is the DOM, in plain English?',
    'The DOM is the browser\'s object representation of a document. It organizes elements and text into a tree, so code can find, inspect, and change parts of the page. The HTML text is the source description; the DOM is the structured document the browser has built from it.',
    'Picture a family tree for a page. A section can contain a heading and several paragraphs, just as one branch can have smaller branches. This tree describes document relationships, not necessarily the final visual layout.',
    '```js\nconst title = document.querySelector("h1");\nif (title) {\n  title.textContent = "Welcome";\n}\n```\n\nThe selector finds the first h1 element. The condition handles the possibility that none exists. textContent changes its text without interpreting that text as HTML.',
    'A DOM query can return null. Also, inserting untrusted strings through innerHTML can interpret them as markup. Use safe text APIs when you intend to display ordinary text.',
    'What should you check before using the result of `document.querySelector(".missing")`?',
    'Check whether it found an element. **The result can be null.** Trying to access a property on null causes an error; handle the missing-element case deliberately.')
add('http', 'HTTP requests and responses', 'HTTP|request|response|status code|fetch',
    'What happens during a basic HTTP request?',
    'A client, such as a browser, sends a request asking a server to perform an operation on a resource. The server returns a response with a status, headers, and often a body. A request and its response are messages; they are not the same thing as the page you eventually render.',
    'A customer sends an order to a café and receives a reply. The reply may contain the meal, a receipt, or an explanation that the order could not be fulfilled. HTTP status codes are like standardized labels describing the outcome.',
    'A request might be GET /books. A successful response could have status 200 and a JSON list of books. A 404 means the requested resource was not found. A 500 indicates a server-side failure. Your UI needs to handle more than the successful case.',
    'fetch can resolve successfully even when the HTTP status indicates failure. Check response.ok or the relevant status before treating the body as a successful application result.',
    'If fetch returns a Response with status 404, must its Promise have rejected?',
    '**No.** Receiving an HTTP error response is different from failing to receive a response. The Promise can fulfill with that Response, leaving your code to inspect the status and handle it.')
add('json', 'JSON: data as text', 'JSON|JSON.parse|JSON.stringify|serialization',
    'Why do applications turn objects into JSON?',
    'An in-memory object cannot be sent directly as a JavaScript object to every other program. JSON is a text format for structured data that many languages understand. Stringifying produces JSON text; parsing reads JSON text and creates values in the receiving program.',
    'Imagine writing the contents of a box onto a packing list, then using the list to rebuild the contents elsewhere. JSON describes data in a shared format. It does not preserve every kind of object or behavior a language can create.',
    '```js\nconst text = JSON.stringify({ score: 3 });\n// text is: \'{"score":3}\'\nconst value = JSON.parse(text);\nvalue.score; // 3\n```\n\nThe text is a string. After parsing, value is an object again. These are different representations.',
    'Parsing is not validation. Valid JSON can still have missing fields or the wrong shape for your application. JSON also does not directly represent functions, undefined, or every specialized JavaScript object.',
    'Does successfully parsing `{"age":"many"}` prove that age is a valid numeric age?',
    '**No.** The text is valid JSON, but age is a string containing "many". Validate the expected type and allowed values after parsing.')
add('flexbox', 'Flexbox layout', 'flexbox|display: flex|justify-content|align-items|flex-direction',
    'What problem does Flexbox help solve?',
    'Flexbox arranges items along a main direction and helps distribute space between them. You apply display: flex to a parent, then its direct children become flex items. The main direction can be a row or a column; alignment rules depend on that direction.',
    'Think of arranging books on a shelf and deciding how to share spare space around them. A row shelf resembles one main axis. Turning the shelf arrangement into a vertical stack changes the direction, so "main" does not always mean horizontal.',
    '```css\n.toolbar {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n}\n```\n\nWith the default row direction, the first rule creates a row layout. Space-between spreads items along the row, and align-items centers them on the cross axis.',
    'justify-content and align-items refer to axes, not fixed screen directions. With flex-direction: column, the main axis is vertical. Check the direction before assuming which property controls horizontal alignment.',
    'Where should you put `display: flex`: on every child, or on the parent that should arrange those children?',
    'On **the parent container**. Its direct children become flex items. A child may also be a flex container for its own children, but that is a separate layout decision.')
add('responsive', 'Responsive layouts', 'responsive|media query|viewport|mobile|breakpoint',
    'What does responsive design mean for a web page?',
    'A responsive page adapts its layout to the available space and input conditions. It should remain usable on a narrow phone as well as a wider screen. This often means flexible sizing, wrapping, and changing the arrangement of content rather than merely shrinking everything.',
    'You might arrange chairs in several rows in a wide room and one column in a narrow hallway. The chairs should still be large enough to use. Responsive design changes the arrangement while keeping the controls and text usable.',
    '```css\n.cards { display: grid; grid-template-columns: 1fr 1fr; }\n@media (max-width: 600px) {\n  .cards { grid-template-columns: 1fr; }\n}\n```\n\nThis example uses two columns when there is room and one column on narrower viewports. The breakpoint should follow the content\'s needs.',
    'A layout that technically fits can still have unreadable text or tiny buttons. Test actual reading, tapping, keyboard input, and scrolling at narrow widths, including long code and long words.',
    'If two cards become too narrow to read on a phone, what is often better than halving the font size?',
    '**Stack the cards into one column** and keep readable text and usable controls. Change the layout to suit the space instead of making the content difficult to use.')
add('accessibility', 'Accessible controls', 'accessibility|accessible|aria|screen reader|keyboard|focus',
    'Why should a web control work with a keyboard as well as a mouse?',
    'People use different devices and ways of interacting. Keyboard support helps users who cannot use a mouse and supports many assistive tools. A usable control needs a clear name, a meaningful role, an understandable state, and a visible focus indicator.',
    'A building needs understandable signs and usable entrances, not just an attractive front door. An app similarly needs more than a visually clickable shape. Users must be able to find the control and understand what it does.',
    '```html\n<button type="button">Show answer</button>\n```\n\nA native button already supports standard keyboard interaction and communicates a button role. Its visible text supplies an accessible name. Custom controls require you to recreate more of that behavior.',
    'Adding an ARIA label does not automatically add keyboard interaction or fix an incorrect role. Start with appropriate native elements, preserve focus visibility, and verify behavior with actual keyboard use.',
    'A button contains only a trash-can icon. What information might a screen-reader user still need?',
    'A meaningful **accessible name**, such as "Delete card." The icon alone may not communicate the action. Make sure the name describes the specific operation, especially when several delete controls are present.')

# 06 — React without the mystery
add('components', 'React components', 'React|component|JSX|rendering|render',
    'What is a React component?',
    'A component is a reusable description of part of a user interface. A function component receives inputs called props and returns what the UI should look like. React calls it during rendering and uses the result to update the interface as needed.',
    'Imagine a reusable recipe for a name badge. You give it a name and it describes a badge showing that name. The recipe can be used in many places. React components describe UI; they should not perform arbitrary side effects just because they are being rendered.',
    '```jsx\nfunction Greeting({ name }) {\n  return <h1>Hello, {name}</h1>;\n}\n// <Greeting name="Ada" /> shows Hello, Ada\n```\n\nThe braces insert a JavaScript value into the JSX. Greeting can be reused with another name without duplicating its layout.',
    'Rendering may happen more often than you expect. Do not start a purchase, mutate external data, or subscribe to an event simply by running a component body. Put actions and synchronization in the appropriate places.',
    'If you render `<Greeting name="Lin" />`, where does Greeting get the value "Lin"?',
    'Through its **props**. The name property is supplied by the parent, and the function reads it from its input object. The component can then include that value in its returned UI.')
add('props', 'Props are component inputs', 'props|prop|children|passing data',
    'How should a child component treat the props it receives?',
    'Treat props as inputs owned by the caller. Read them to decide what to display, but do not mutate them. If a child needs to request a change, the parent can pass a callback that describes how the change should happen.',
    'A restaurant receives an order slip from a customer. The kitchen uses that input rather than secretly rewriting what the customer ordered. A callback is like an agreed channel for requesting a change to the order.',
    '```jsx\nfunction Counter({ count, onIncrement }) {\n  return <button onClick={onIncrement}>{count}</button>;\n}\n```\n\nThe child displays count and calls onIncrement when clicked. The parent decides how to update the value and passes the new count back down.',
    'Copying every prop into local state can create two versions that disagree. Use the prop directly when possible. Introduce local state only when you need a separate stateful concept, such as an editable draft.',
    'A child wants to change a value owned by its parent. Should it mutate a prop object directly?',
    '**No.** The parent should expose an appropriate change callback or state update mechanism. Mutating props can make updates unpredictable and interfere with React\'s assumptions about data flow.')
add('state', 'React state', 'useState|setState|state update|React state',
    'Why use state instead of an ordinary local variable for a value shown in the UI?',
    'State lets React remember a value between renders and know when to render again after it changes. A normal local variable in a component is recreated when the component runs. Assigning to it does not tell React that the screen needs updating.',
    'State is like a score recorded on the official scoreboard, with a process for announcing updates. An ordinary local variable is like a temporary note on scrap paper. Changing the scrap paper does not automatically update the scoreboard.',
    '```jsx\nconst [count, setCount] = React.useState(0);\nconst increment = () => setCount(c => c + 1);\n```\n\ncount is the value for the current render. setCount requests an update. The function form receives the previous pending value and computes the next one.',
    'Do not expect count to change immediately inside the same handler after calling setCount. The handler still sees the value from its render. Use functional updates when the next state depends on the previous state.',
    'If you call `setCount(c => c + 1)` twice in one handler starting from 0, what value should the two updates produce?',
    '**2.** Each update function works from the result of the preceding queued update. This differs from repeatedly using a stale captured count value.')
add('effects', 'Effects and cleanup', 'useEffect|effect|cleanup|dependency array',
    'What is a React effect useful for?',
    'An effect synchronizes a component with something outside React, such as a browser event listener or a subscription. Its cleanup undoes that synchronization when dependencies change or the component is removed. Many calculations from props and state belong directly in rendering instead.',
    'Renting a room may require connecting a service when you arrive and disconnecting it when you leave. An effect sets up the connection; cleanup releases it. You should not create another connection on every visit without closing the old one.',
    '```jsx\nReact.useEffect(() => {\n  const onResize = () => console.log(window.innerWidth);\n  window.addEventListener("resize", onResize);\n  return () => window.removeEventListener("resize", onResize);\n}, []);\n```\n\nThe returned function removes the same listener that was added. It prevents old listeners from being left behind.',
    'Leaving a changing value out of the dependency list can make an effect use stale information. Adding effects for values you can directly calculate can also create unnecessary updates. Understand what external system you are synchronizing.',
    'Why should an effect that starts an interval usually clear it in cleanup?',
    'Otherwise the interval can keep running after the component leaves or after a new interval replaces it. **Cleanup prevents leftover work** and repeated callbacks from old setups.')
add('keys', 'Keys identify list items', 'React key|keys|key prop|list rendering',
    'Why does React ask for a key when rendering a list?',
    'A key helps React identify which item corresponds to which item across renders. This matters when items move, appear, or disappear. Stable identity helps React preserve the correct component state for the correct item.',
    'Students keep their identity when they move to different seats. A student ID is like a stable key; a seat number is like an array index. Using seat numbers as identities can confuse who owns a notebook after everyone moves.',
    '```jsx\nusers.map(user => <Profile key={user.id} user={user} />);\n```\n\nThe ID belongs to the user, so it stays with that user when the list is reordered. Keys need to distinguish siblings in this rendered list.',
    'A newly generated random key on each render gives an item a new identity every time. That can cause remounts and lost local state. Array indexes are also risky when order can change or items can be inserted.',
    'A list of editable tasks can be reordered. Is the task\'s persistent ID or its current array index usually the safer key?',
    'The **persistent task ID**. It follows the same task through reordering. An index describes the position, so the same index can refer to a different task after a move.')
add('refs', 'Refs remember without rerendering', 'useRef|ref|refs|DOM reference',
    'How is a ref different from state in React?',
    'A ref remembers a value across renders, but changing its current property does not itself trigger a render. It is useful for things such as a DOM element reference, a timer ID, or a mutable value that should not directly drive the visible UI.',
    'A backstage notebook can store a timer ID without changing the show the audience sees. State is the information that should drive the displayed scene. A ref can hold that backstage information, but it does not tell React to redraw the scene.',
    '```jsx\nconst inputRef = React.useRef(null);\n// <input ref={inputRef} />\n// Later, from an appropriate handler:\ninputRef.current?.focus();\n```\n\nReact can place the input element in current. The optional access handles the time when the element is not available.',
    'If changing a value should update the screen, storing it only in a ref usually will not do that. Use state for rendered data. Avoid reading or writing refs during rendering except for carefully supported initialization patterns.',
    'If you increment `counterRef.current`, will React automatically rerender to display the new number?',
    '**No.** Ref mutation does not request a render. Use state if the displayed number needs to update in response to that change.')
add('controlled-input', 'Controlled form inputs', 'controlled|onChange|input value|form state',
    'What makes a React input controlled?',
    'Its displayed value comes from React state or another React-managed value, and changes are handled by updating that value. The input tells you what the user typed through an event; your code updates the value that React passes back to the input.',
    'Think of a shared form where the official record determines what is displayed. The user requests a change, the record is updated, and the screen shows the updated record. There should be a clear owner for the value.',
    '```jsx\nconst [name, setName] = React.useState("");\n// In the returned JSX:\n<input value={name} onChange={e => setName(e.target.value)} />\n```\n\nTyping triggers onChange. The handler stores the new text. React renders that text as the input\'s value.',
    'Passing a value without an appropriate way to update it can make the field effectively read-only. Also avoid switching unintentionally between undefined and a string value, which can switch control modes.',
    'Why might an input with `value="Ada"` and no change handler refuse to keep what the user types?',
    'React is continually told that its value is the fixed string **"Ada"**. To make an editable controlled input, provide a changing value and an onChange handler that updates it.')
add('context', 'Sharing data with context', 'useContext|context|provider|prop drilling',
    'What does React context help you avoid?',
    'Context lets a component read a value from an appropriate provider above it without passing that value through every intermediate component as a prop. It is useful for shared concerns such as a theme. It does not automatically manage state or remove the need to think about updates.',
    'A building-wide noticeboard can make information available without every person forwarding the same message down a chain. The noticeboard still needs an owner, and changing it may affect everyone who reads it.',
    'A Theme provider can expose a theme value. A deeply nested button reads that context to decide its styling. The intermediate layout components do not all need theme props solely to pass the value onward.',
    'Putting all application data into one frequently changing context can cause broad updates and make ownership unclear. Keep related concerns separate and use simpler props when they communicate the relationship clearly.',
    'Does creating a context automatically make its value persistent across browser reloads?',
    '**No.** Context distributes a value within the component tree. Persistence requires a separate storage mechanism, such as a server or browser storage, plus code to restore the value.')

# 07: Databases in plain English.
add('tables', 'Tables, rows, and columns', 'database table|rows|columns|primary key',
    'How does a database table organize information?',
    'A table stores one kind of thing, such as customers. Each row is one record. Each column describes an attribute, such as name. A primary key identifies each row uniquely, so two customers with the same name can still be different people.',
    'Imagine a class register: each line is a student, and the headings are student ID, name, and email. The student ID identifies the person; the name alone may not. Unlike a loose spreadsheet, the database can enforce rules about the records.',
    'A users table might contain columns id, name, and email. The row `(7, "Ada", "ada@example.test")` describes one user. A second Ada gets a different ID. Orders can store a user_id to refer to the appropriate user.',
    'Do not use a display name as if it were guaranteed unique. Also avoid stuffing a list of unrelated records into one text cell when you need to query and connect those records individually.',
    'Two customers share the same name. How can an orders table reliably refer to the right customer?',
    'Store the customer\'s **unique ID** in the order. A foreign-key constraint can check that the referenced customer exists. The display name is for people; the ID distinguishes records.')
add('select', 'SELECT and WHERE', 'SELECT|WHERE|SQL query',
    'How do SELECT and WHERE work together in SQL?',
    'SELECT says which columns you want returned. FROM names the table to read. WHERE keeps only rows that meet a condition. Reading a query in this order can help: start with the table, filter its rows, then choose the information to show.',
    'You have a box of order forms. First choose the order box, then keep the paid forms, then copy only each form\'s ID and total. The query describes the result; the database chooses how to obtain it.',
    '```sql\nSELECT id, total\nFROM orders\nWHERE status = \'paid\';\n```\n\nAn unpaid order is excluded. A paid order contributes its id and total, without every other column. Add ORDER BY if you need a defined result order.',
    'SQL does not guarantee row order unless you request it with ORDER BY. Also, a missing WHERE on an UPDATE or DELETE can affect every row, so inspect your condition carefully before changing data.',
    'How would you ask for the names of users whose active column is true?',
    '```sql\nSELECT name FROM users WHERE active = TRUE;\n```\n\nThis keeps active users and returns their names. Boolean syntax can vary between database systems.')
add('joins', 'Connecting tables with JOIN', 'JOIN|joins|foreign key|relational',
    'What does a JOIN let you do with two database tables?',
    'A join combines matching rows from tables using a condition. For example, each order stores a customer ID, while the customer table stores the name. Joining them lets you show the order and the customer\'s name together without storing that name in every order.',
    'Match delivery slips to an address book using customer numbers. One customer may have several slips, so the customer\'s details may appear on several result lines. A join is not automatically one result row per customer.',
    '```sql\nSELECT orders.id, customers.name\nFROM orders\nJOIN customers ON orders.customer_id = customers.id;\n```\n\nAn inner JOIN returns matching pairs. A LEFT JOIN also keeps rows from the left table that have no match, filling the missing right-side values with NULL.',
    'Joining on a non-unique name can create unintended matches. A one-to-many join can also multiply rows before you calculate totals. Understand what one row of the result represents.',
    'You need every customer, including customers with no orders. Which table goes on the left of a LEFT JOIN?',
    '**Customers.** Start with customers and LEFT JOIN orders using the customer ID. Customers without orders remain in the result, with NULL values for the order columns.')
add('aggregation', 'Grouping and counting', 'GROUP BY|COUNT|SUM|aggregation|HAVING',
    'What does GROUP BY change about a SQL result?',
    'GROUP BY collects rows with the same grouping values so you can calculate a result for each group. COUNT counts rows or non-NULL values, SUM adds values, and AVG calculates an average. The result describes groups instead of showing each original row separately.',
    'Sort receipts into piles by customer. Count the receipts in each pile or add their totals. Each output line now represents a customer\'s pile, rather than one receipt.',
    '```sql\nSELECT customer_id, COUNT(*) AS order_count\nFROM orders\nGROUP BY customer_id;\n```\n\nIf customer 7 has three orders, their result row contains 7 and 3. WHERE filters input rows; HAVING filters the groups after aggregation.',
    'COUNT(column) skips NULL values; COUNT(*) counts rows. After a LEFT JOIN, COUNT(*) can count the unmatched placeholder row, so COUNT(orders.id) is often the intended count of actual orders.',
    'What does `SELECT status, COUNT(*) FROM orders GROUP BY status` tell you?',
    'It returns **one row per status value**, along with how many order rows have that status. It does not return one row per individual order.')
add('sql-null', 'Missing information in SQL', 'SQL NULL|IS NULL|COALESCE|three-valued',
    'Why do SQL queries use IS NULL instead of = NULL?',
    'NULL represents missing or unknown information. A normal comparison with NULL generally produces unknown, rather than true or false. WHERE keeps rows where the condition is true, so use IS NULL or IS NOT NULL when checking whether a value is missing.',
    'If you do not know someone\'s age, you cannot conclude that it equals 30 or that it differs from 30. You can only say that the age is unknown. Missing information is different from a known value of zero.',
    '```sql\nSELECT id FROM users WHERE phone IS NULL;\n```\n\nThis finds users with a missing phone value. `COALESCE(phone, \'Not supplied\')` can choose a display fallback for NULL; it does not replace an empty string.',
    'An empty string, zero, and NULL represent different things in most databases. In particular, `value != NULL` is not a reliable way to find present values. Use IS NOT NULL.',
    'Which condition finds rows where shipped_at has a recorded value?',
    '**`shipped_at IS NOT NULL`**. It checks for presence directly, rather than comparing a timestamp to an unknown value.')
add('indexes', 'Database indexes', 'database index|indexes|index scan|query plan',
    'How can an index make a database query faster?',
    'An index is an extra lookup structure the database maintains. It can help find relevant rows without examining every row. The benefit depends on the query, how selective it is, and the index structure. Indexes use storage and add maintenance work when data changes.',
    'A book index sends you to pages about a topic instead of making you read every page. Creating and updating that index costs work. If you want nearly the whole book, looking up each page individually may not help.',
    'If you often look up a user by email, an index on email may let the database locate a matching row quickly. An index on an unrelated column, such as birth_year, does not solve the same lookup. Use the database\'s query-plan tools to inspect actual behavior.',
    'Adding an index to every column can slow writes and waste storage. A multi-column index also has ordering and query-shape considerations; it is not identical to independent indexes on every column.',
    'Why might indexing a column that is updated frequently increase write cost?',
    'The database may need to update **both the table and the index entries** when that value changes. Faster reads can come with extra write work and storage.')
add('transactions', 'Transactions keep changes together', 'transaction|ACID|commit|rollback|atomic',
    'What problem does a database transaction solve?',
    'A transaction groups operations into a unit that can commit together or roll back. For a money transfer, subtracting from one account and adding to another should not leave only half the transfer saved. Isolation rules also control how concurrent transactions interact.',
    'Imagine a two-part form that must be accepted as a complete set. If one required part fails, neither part is accepted. The analogy describes all-or-nothing changes; it does not automatically make an external email or payment reversible.',
    '```sql\nBEGIN;\nUPDATE accounts SET balance = balance - 10 WHERE id = 1;\nUPDATE accounts SET balance = balance + 10 WHERE id = 2;\nCOMMIT;\n```\n\nReal transfer code must also check that both accounts exist, enforce balance rules, and handle concurrent updates and errors. Roll back on a failed operation.',
    'A transaction alone does not prove your business rules are correct. For example, you may still need constraints or locking to prevent invalid concurrent withdrawals. External side effects need their own coordination.',
    'If an operation fails after the first database change, what should the application do before treating the transfer as successful?',
    'It should **roll back the transaction and report or handle the failure**, rather than commit a partial transfer. A successful outcome requires all required changes and checks to succeed.')
add('constraints', 'Let the database enforce rules', 'constraint|UNIQUE|NOT NULL|schema|migration',
    'Why use database constraints when the application already validates data?',
    'A constraint lets the database enforce a rule for every writer. NOT NULL requires a value; UNIQUE prevents duplicates according to the database\'s rules; a foreign key checks a relationship. These checks protect data even when two requests race or another program writes to the database.',
    'A form can remind people to use unique ticket numbers, but the ticket office must also refuse duplicates. A reminder helps the user; the central rule protects the shared record.',
    'Two signup requests can both check that a username is available before either saves it. A UNIQUE constraint on the appropriate normalized username lets the database reject the conflicting insert. The application should turn that failure into a clear response.',
    'Checking availability and then inserting is not enough to prevent a race. Also plan schema migrations around existing data: adding NOT NULL can fail if old rows contain NULL.',
    'Why can two concurrent requests both pass an application-level “does this name exist?” check?',
    'Both may read **before either insert is committed**. A database uniqueness rule is needed to prevent both conflicting values from being accepted, along with handling the conflict in the application.')

# 08: Git and the terminal.
add('terminal', 'The terminal is a text interface', 'terminal|shell command|command line|CLI',
    'What happens when you type a command into a terminal?',
    'The terminal displays a text interface to a shell. The shell interprets your command and runs a built-in action or a program. The command usually has a program name and arguments that tell it what to do. Its working directory helps determine which files it uses.',
    'Think of giving written instructions to an assistant who is currently standing in one room. “List the files here” depends on which room they are in. The shell has a current directory, and different commands can change or use it.',
    'In PowerShell, `Get-Location` shows your current directory and `Get-ChildItem` lists its contents. `Set-Location src` moves into the src child directory if it exists. In many Unix shells, the corresponding commands are `pwd`, `ls`, and `cd src`.',
    'Commands differ across shells and operating systems. Read what a command does before pasting it, particularly when it deletes files, changes permissions, or downloads and executes code.',
    'A tool says it cannot find package.json, but the file exists inside your project. What simple thing should you check first?',
    'Check your **current working directory**. You may be running the tool from the parent folder or a different project. Move to the intended project directory and verify the file is there.')
add('paths', 'Absolute and relative paths', 'file path|relative path|absolute path|working directory',
    'How is a relative file path different from an absolute path?',
    'An absolute path identifies a location starting from a filesystem root. A relative path is interpreted from a base directory, often the current working directory. A dot means the current directory; two dots mean its parent. The same relative path can identify different files from different bases.',
    '“The kitchen beside this room” is relative. A full street address is closer to an absolute location. Relative directions are useful, but only when everyone agrees where they start.',
    'If your working directory is `/project`, then `src/app.js` refers to `/project/src/app.js`. From `/project/tests`, `../src/app.js` reaches that same file. Windows uses drive roots such as `C:\\project` and commonly uses backslashes.',
    'A path in an import, a browser URL, and a shell command may use different base locations and resolution rules. Do not assume they all resolve relative to the file you are currently editing.',
    'From `/project/tests`, what does `../README.md` refer to?',
    '**`/project/README.md`**. The two dots move to the parent directory, and README.md selects the file inside that parent.')
add('git-status', 'Understand your Git working tree', 'git status|working tree|untracked|working directory changes',
    'What does git status help you understand before making a commit?',
    'It shows your current branch and which files differ from the recorded state. Changes can be unstaged, staged for the next commit, or untracked. Reading this summary helps you decide exactly which work belongs in your next saved snapshot.',
    'Your desk holds work in progress, a tray holds pages selected for filing, and the archive holds saved versions. Git status tells you what is on the desk and in the tray; it does not automatically file everything.',
    'After editing app.js, `git status` may list it as modified but unstaged. After `git add app.js`, the selected content is staged. If you edit app.js again, the file can have both staged and unstaged changes.',
    'Staging a file does not continually track later edits into the same staged snapshot. Review `git diff` for unstaged changes and `git diff --staged` for what the next commit will record.',
    'You stage a file and then edit it again. Does the next commit automatically include that new edit?',
    '**No.** The index contains the version you staged. Stage the later change if you want to include it, and inspect the staged diff before committing.')
add('git-commit', 'Stage and commit a coherent change', 'git add|git commit|staging|staged|snapshot',
    'What is the difference between git add and git commit?',
    'git add selects file content for the next commit by updating the index, also called the staging area. git commit records that staged snapshot with a message and history links. A commit is local until you send it to a remote repository.',
    'Choose which photos belong in an album, then save the album with a description. Selecting photos is staging; saving the album is committing. Uploading it somewhere is a separate action.',
    '```text\ngit add src/app.js\ngit diff --staged\ngit commit -m "Handle empty search results"\n```\n\nThis stages a chosen file, lets you inspect the selected changes, and records them locally. The message explains the concrete change.',
    'Blindly staging every file can include unrelated edits or secrets. Keep each commit coherent and inspect what is staged. Creating a commit does not automatically push it to a shared server.',
    'Which command lets you inspect the changes currently selected for your next commit?',
    '**`git diff --staged`**. It compares the staged content to the current commit. Plain git diff instead shows unstaged changes relative to the index.')
add('branches', 'Branches are movable names', 'git branch|branch|checkout|git switch',
    'What is a Git branch, in beginner-friendly terms?',
    'A branch is a name pointing to a commit. When you make a new commit on that branch, its pointer moves forward. Different branches can therefore develop different lines of history while sharing earlier commits. Switching branches changes which line you are working on.',
    'Imagine bookmarks in a shared history book. Two bookmarks can start on the same page and move along different continuations. Creating a branch creates a bookmark; it does not make a whole separate remote repository.',
    '`git switch -c search-fix` creates a branch at the current commit and switches to it. New commits advance search-fix. They do not automatically move the main branch. Git may refuse a switch if it would overwrite uncommitted work.',
    'Uncommitted edits are not safely stored just because you created a branch name. Inspect your working tree before switching, and commit or otherwise preserve work appropriately.',
    'You commit on a new feature branch. Does that automatically add the commit to main?',
    '**No.** The feature branch moves forward. Main changes only when you explicitly update it, such as by merging the feature branch through your project\'s workflow.')
add('merge-conflicts', 'Resolve merge conflicts deliberately', 'merge conflict|conflict markers|git merge|rebase',
    'What is Git asking you to do when a merge conflict appears?',
    'Git found changes it could not combine automatically. You need to decide what the final content should be, remove conflict markers, and verify that the combined result makes sense. Both sets of changes may contain useful intent; selecting one whole side is not always correct.',
    'Two people revised the same paragraph differently. An editor must produce a coherent final paragraph. Keeping both versions verbatim may repeat or contradict information; deleting either version blindly can lose an important correction.',
    'Conflict markers such as `<<<<<<<`, `=======`, and `>>>>>>>` separate conflicting text versions. Edit the file into its intended final form, remove the markers, run relevant checks, and stage the resolved file. Then complete the merge or continue the rebase as appropriate.',
    'Removing the marker lines alone is not enough if the remaining code is wrong. Also remember that “ours” and “theirs” can be confusing during a rebase; inspect the actual changes instead of guessing by those labels.',
    'A resolved file has no conflict markers but calls a function that the other change renamed. Is the conflict fully handled?',
    '**Not yet.** The combined code still needs to use the correct function name and pass relevant checks. A clean text merge does not guarantee a correct program.')
add('remotes', 'Fetch, pull, and push', 'git fetch|git pull|git push|remote|origin',
    'How do git fetch, git pull, and git push differ?',
    'Fetch downloads remote history and updates your remote-tracking references without integrating it into your current branch. Pull fetches and then integrates according to the selected configuration, commonly merge or rebase. Push asks a remote to update its references with your local commits.',
    'Fetch is receiving a colleague\'s latest draft for inspection. Pull also combines their history into your working line. Push sends your saved history back to the shared location. These actions have different effects, so choose deliberately.',
    '`git fetch origin` updates your view of origin\'s branches. You can inspect differences before integrating them. After local commits are ready, a normal push can publish them, provided the remote accepts the update and your permissions allow it.',
    'A rejected push may mean the remote has commits you do not have. Inspect and integrate appropriately. Force-pushing can replace shared history and should not be used as a reflexive fix.',
    'You want to see whether a remote branch has changed before combining it with your branch. Which operation fits?',
    '**Fetch.** It retrieves the remote history for inspection without automatically merging or rebasing your current branch.')
add('gitignore', 'Ignore generated files and protect secrets', 'gitignore|.gitignore|tracked secret|environment file',
    'What does .gitignore do, and what does it not do?',
    'A .gitignore file lists patterns for files Git should normally leave untracked, such as build output or local configuration. It does not remove a file that is already tracked, and it does not erase anything from previous commits.',
    'A sign saying “do not file these papers” helps with future filing. It does not remove papers already placed in the archive or copies already sent elsewhere.',
    'A project may ignore node_modules, dist, and local secret-bearing environment files. It can commit an example configuration containing placeholder names and no real credentials. Already tracked files require a separate deliberate change to stop tracking them.',
    'Adding a leaked key to .gitignore does not make it safe again. Revoke or rotate the exposed credential, investigate its use, and follow the project\'s process for removing sensitive history where needed.',
    'A real API key was committed yesterday. Is adding its file to .gitignore today sufficient?',
    '**No.** The key remains in history and may have been copied. Revoke or rotate it and handle the exposure; ignoring the file only affects appropriate future untracked files.')

# 09: Algorithms you can picture.
LESSONS.extend(CRUD['BEGINNER'])

add('apis', 'An API is an agreed interface', 'API|endpoint|request body|response body|REST',
    'What is an API, explained without assuming you know web programming?',
    'An API is a defined way for one piece of software to ask another to do something or provide data. A web API often specifies a URL, an HTTP method, input data, and possible responses. The agreement lets callers use the service without knowing all of its internal code.',
    'A restaurant menu lists what you can order and what information the kitchen needs. You do not have to know the kitchen layout. An API likewise exposes specific operations; the service must still validate requests and decide who may use them.',
    '`GET /tasks/7` might request task 7. `POST /tasks` with a JSON body might request a new task. The API contract should define required fields, success responses, error responses, and access rules. These endpoint conventions still need explicit agreement.',
    'An endpoint is not safe merely because its URL is hard to guess. The server must authenticate and authorize appropriately, validate input, and handle failure. Client-side checks cannot enforce server access rules.',
    'Why can a frontend keep working after a backend refactor if the API contract is preserved?',
    'The frontend depends on the **agreed requests and responses**, rather than the backend\'s internal implementation. Preserving that observable contract lets the internal code change without requiring every caller to change.')
add('auth', 'Identity is different from permission', 'authentication|authorization|permission|access control',
    'How do identity checks differ from permission checks in a web app?',
    'Authentication establishes who a caller is. Authorization decides whether that caller may perform this action on this resource. A signed-in user may still lack permission to read another user\'s private document. Both checks belong at the trusted service boundary.',
    'An ID check establishes your identity at an office. Your badge permissions determine which rooms you can enter. Recognizing you does not give you access to every room.',
    'A server handling `GET /notes/42` may first verify a session. It must then check whether note 42 belongs to that user or is shared with them. Changing the number in the URL must not bypass that ownership check.',
    'Hiding a button in the browser does not enforce a permission. A caller can send requests directly. Also, using a difficult-to-guess ID is not a replacement for checking access to the resource.',
    'A logged-in user changes a document ID in a request and sees someone else\'s private file. Which check is missing?',
    '**Authorization for the requested document.** Authentication may have identified the user correctly, but the service failed to verify that this user could access that particular file.')
add('caching', 'A cache keeps a reusable copy', 'cache|caching|TTL|invalidation|stale',
    'Why use a cache, and what is its main correctness challenge?',
    'A cache stores a result so that future requests can reuse it instead of repeating slower work. This can reduce latency and load. The stored copy may become outdated, so you need a policy for how fresh the result must be and how changes update or invalidate the copy.',
    'Keeping a copy of a train timetable saves repeated trips to the station board. The copy becomes misleading when the timetable changes. A timestamp helps you judge its age, but it does not guarantee that no update occurred.',
    'An API might cache a public product description for five minutes. A cache key identifies the product and any relevant variation, such as language. A stock check before purchase may require stronger freshness than a descriptive product page.',
    'Do not cache private responses under a key shared by different users. Also, a time-to-live is a freshness policy, not a guarantee that the cached value is current throughout that period.',
    'What can go wrong if a cache key for a private dashboard contains only the URL and ignores the signed-in user?',
    'One user may receive **another user\'s cached private data**. Cache design must respect the response\'s access boundaries and all inputs that affect the result.')
add('idempotency', 'Make retries safe to repeat', 'idempotent|idempotency|duplicate request|deduplication',
    'What does it mean for an operation to be idempotent?',
    'Repeating the same operation has the same intended effect as applying it once. Setting a preference to dark mode can be idempotent; toggling it is not. This property helps when a caller retries because it cannot tell whether an earlier request completed.',
    'Writing “set the temperature to 20” repeatedly leaves the same target temperature. Writing “increase the temperature by 1” repeatedly keeps changing it. The difference is the operation\'s meaning, not whether the requests look similar.',
    'A payment creation endpoint can accept an idempotency key for one logical attempt. The server records that key and the outcome so a retry can return the recorded result instead of creating another payment. The key and effect need reliable coordination.',
    'Generating a new key on every retry defeats deduplication. The server should also reject inappropriate reuse of a key with different request data and handle concurrent requests consistently.',
    'Which operation is naturally idempotent: “set completed to true” or “toggle completed”?',
    '**Set completed to true.** Repeating it leaves the task completed. Toggling twice can return the task to its starting state, so repeated calls have different effects.')
add('retries', 'Retry with limits and a reason', 'retry|retries|backoff|jitter|timeout',
    'Why should retries have delays, limits, and an overall deadline?',
    'Some failures are temporary, but immediate repeated requests can overload an already struggling service. Delays give it time to recover. A retry limit and deadline stop work from continuing forever. Before retrying, consider whether the operation is safe to repeat and whether the failure can improve.',
    'If a shop is briefly busy, returning later may help. Ringing the bell hundreds of times immediately makes the situation worse. If many people return at exactly the same time, the crowd repeats; varying the delay spreads them out.',
    'A client might retry a temporary network failure after increasing delays, adding randomness called jitter. It should stay within an overall deadline and respect relevant server guidance. A validation error usually needs corrected input instead of the same request again.',
    'A timeout means the caller did not receive a result in time; it does not prove the server did nothing. Retrying a write without an idempotency strategy can duplicate effects.',
    'A payment request times out. Can you safely conclude that the customer was not charged?',
    '**No.** The server may have completed the charge before the response was lost. Check the operation\'s status or use an established idempotency mechanism before retrying.')
add('concurrency', 'When operations overlap', 'concurrency|concurrent|race condition|lost update|locking',
    'What is a race condition in a shared update?',
    'A race condition occurs when correctness depends on the timing or ordering of overlapping operations. Two requests can both read an old value, calculate changes independently, and overwrite each other. Correct coordination must happen where the shared data is managed.',
    'Two people read a whiteboard total of 5. Each plans to add 1 and writes 6. The final total is 6, even though two additions should produce 7. Each person\'s isolated arithmetic was right; their combined procedure was wrong.',
    'A read-then-write counter can lose updates. A database statement such as `UPDATE counters SET value = value + 1 WHERE id = 1` expresses the increment to the database, which can coordinate conflicting writes. More complex rules may need transactions, locks, or version checks.',
    'A disabled browser button only reduces accidental repeated clicks in that page. Other tabs, users, workers, and retries can still overlap. Protect the shared operation at its authoritative storage or service boundary.',
    'Two requests both read stock as 1 and both accept an order. Why is checking stock in application code before a separate write insufficient?',
    'Both checks can succeed **before either write changes the stock**. The check and reservation need atomic coordination, such as an appropriate conditional database update and validation of its result.')
add('background-jobs', 'Do longer work in a background job', 'background job|worker|message queue|at-least-once|job queue',
    'Why might an API put work into a job queue?',
    'A queue lets the request hand longer work to a worker, so the caller need not wait for the whole task in one HTTP response. The application still needs to track progress, handle failures, and tell the caller what was accepted versus what has actually finished.',
    'A repair shop gives you a claim ticket after accepting your item. Acceptance is not the same as completion. Workers process jobs later, and the ticket lets you check the outcome.',
    'An export endpoint can create a job record and enqueue its ID. A worker generates the file and records success or failure. The frontend checks job status and shows a download link only when the export has finished.',
    'Many queues can deliver a job more than once, particularly when a worker crashes before acknowledging it. Design processing to tolerate duplicates and acknowledge according to the system\'s completion guarantees.',
    'A worker finishes sending an email but crashes before acknowledging the job. What duplicate-work risk should you consider?',
    'The queue may deliver the job again, causing **another email**. Use an appropriate deduplication or provider idempotency strategy where available, and understand the limits of coordinating the external side effect.')
add('sql-parameters', 'Keep data separate from SQL instructions', 'SQL injection|parameterized|prepared statement|untrusted input',
    'How do parameterized queries help prevent SQL injection?',
    'A parameterized query supplies SQL instructions separately from user-provided values. The database driver binds those values as data, so characters in a name do not become new SQL syntax. You should use the driver\'s parameter mechanism rather than constructing SQL by joining raw input strings.',
    'A form has separate boxes for an instruction and a customer\'s name. Writing instruction-like words in the name box should still produce a name, not change what the office is asked to do.',
    'With a driver that uses $1 placeholders, the query text can be `SELECT id FROM users WHERE email = $1`, and the email is passed separately in the parameters list. Placeholder syntax differs across drivers. The value is not pasted into the SQL text by your code.',
    'Parameters generally represent values, not arbitrary table names, column names, or sort directions. Dynamic identifiers need a controlled allowlist or an appropriate safe API. Validation alone is not a substitute for parameterization.',
    'A search accepts a name containing an apostrophe. Should you manually paste that name into the SQL query string?',
    '**No.** Pass the name as a bound parameter through the database driver. Apostrophes and other characters then remain part of the data rather than changing the SQL structure.')

GROUPS = [
    ('Read your first program', 'braces', 'violet', ['JavaScript', 'Values', 'Types'], 'https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting'),
    ('Follow the flow', 'braces', 'amber', ['Functions', 'Loops', 'Closures'], 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions'),
    ('Work with collections', 'braces', 'green', ['Arrays', 'Objects', 'Collections'], 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Indexed_collections'),
    ('Understand time and failures', 'bug', 'amber', ['Async', 'Debugging', 'Tests'], 'https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Async_JS'),
    ('Understand a web page', 'globe', 'blue', ['HTML', 'CSS', 'Accessibility'], 'https://developer.mozilla.org/en-US/docs/Learn_web_development'),
    ('React without the mystery', 'react', 'blue', ['React', 'Components', 'State'], 'https://react.dev/learn'),
    ('Databases in plain English', 'database', 'blue', ['SQL', 'Data', 'Transactions'], 'https://www.postgresql.org/docs/current/tutorial.html'),
    ('Git and the terminal', 'git', 'amber', ['Git', 'Terminal', 'Teamwork'], 'https://git-scm.com/book/en/v2'),
    ('Build your first CRUD feature', 'network', 'green', ['CRUD', 'Forms', 'Validation', 'Persistence'], 'https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Server-side'),
    ('Build reliable small services', 'network', 'green', ['APIs', 'Reliability', 'Security'], 'https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Server-side'),
]

def make_card(lesson, variant):
    digest = hashlib.sha256(lesson['key'].encode()).hexdigest()
    card_id = f"e0000000-{digest[:4]}-4{digest[4:7]}-8{digest[7:10]}-{digest[10:21]}{variant}"
    first = lesson['plain'] if variant == 0 else lesson['answer'] + '\n\n### Why this happens\n\n' + lesson['plain']
    practice = (lesson['check'], lesson['answer']) if variant == 0 else (lesson['question'], lesson['plain'])
    pages = [
        ('Plain English' if variant == 0 else 'The answer, explained', first),
        ('A worked example', lesson['example']),
        ('Picture it another way', lesson['analogy']),
        ('A common mistake', lesson['mistake']),
        ('Try a small exercise' if variant == 0 else 'Explain it in your own words', practice[0] + '\n\n<!-- recall:solution -->\n\n' + practice[1]),
    ]
    back = '<!-- recall:teaching:v1 -->\n\n' + '\n\n'.join('## ' + title + '\n\n' + body for title, body in pages)
    return {'id': card_id, 'front': lesson['question'] if variant == 0 else lesson['check'], 'back': back, 'kind': 'concept' if variant == 0 else 'practice'}

if __name__ == '__main__':
    assert len(LESSONS) == len(GROUPS) * 8 == 80
    assert len({lesson['key'] for lesson in LESSONS}) == len(LESSONS)
    packs = []
    for i, (name, icon, color, topics, resource) in enumerate(GROUPS):
        packs.append({
            'id': f'a0000000-0000-4000-8000-{4011 if i == 8 else 4001 + i:012}',
            'name': f'{i + 1:02} · {name}', 'track': 'Start here', 'icon': icon, 'color': color,
            'topics': ['Beginner'] + topics,
            'description': 'Learn one idea at a time through plain English, a worked example, an analogy, and a small practice question.',
            'resource': {'label': 'Keep learning · official guide', 'url': resource},
            'cards': [make_card(lesson, variant) for lesson in LESSONS[i * 8:(i + 1) * 8] for variant in (0, 1)],
        })
    output = Path(__file__).resolve().parents[1] / 'src/data'
    for filename, data in [('teaching-lessons.json', LESSONS), ('beginner-expansion.json', packs)]:
        (output / filename).write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Authored {len(LESSONS)} lessons, {len(packs)} decks, and {sum(len(p["cards"]) for p in packs)} cards.')
