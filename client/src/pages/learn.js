import Head from "next/head";
import { useState } from "react";
import Header from "../components/header";
import styles from "../styles/Home.module.css";

export default function Learn() {
  const [expandedChapters, setExpandedChapters] = useState({});

  const toggleChapter = (chapterId) => {
    setExpandedChapters(prev => ({
      ...prev,
      [chapterId]: !prev[chapterId]
    }));
  };

  const chapters = [
    {
      id: "introduction",
      title: "Chapter 1: Introduction to R",
      content: (
        <div className={styles.chapterContent}>
          <h3>What is R?</h3>
          <p>
            R is a powerful programming language and environment specifically designed for statistical computing, 
            data analysis, and graphical representation. It's widely used by statisticians, data scientists, 
            and researchers around the world.
          </p>
          
          <h4>Why Learn R?</h4>
          <ul>
            <li><strong>Free and Open Source:</strong> R is completely free to use and modify</li>
            <li><strong>Statistical Power:</strong> Built-in functions for complex statistical analysis</li>
            <li><strong>Data Visualization:</strong> Excellent tools for creating charts and graphs</li>
            <li><strong>Large Community:</strong> Thousands of packages available for various tasks</li>
            <li><strong>Industry Standard:</strong> Used by major companies and research institutions</li>
          </ul>

          <h4>Getting Started with RStudio</h4>
          <p>
            RStudio is the most popular integrated development environment (IDE) for R. It provides:
          </p>
          <ul>
            <li>Code editor with syntax highlighting</li>
            <li>Console for running R commands</li>
            <li>Environment panel to view variables</li>
            <li>Plots panel for visualizations</li>
            <li>File manager and help system</li>
          </ul>

          <div className={styles.codeExample}>
            <h5>Your First R Command:</h5>
            <pre><code>{`# This is a comment in R
print("Hello, R World!")`}</code></pre>
            <p><em>Output: [1] "Hello, R World!"</em></p>
          </div>
        </div>
      )
    },
    {
      id: "variables",
      title: "Chapter 2: Variables and Data Types",
      content: (
        <div className={styles.chapterContent}>
          <h3>Variables in R</h3>
          <p>
            Variables are containers that store data values. In R, you can assign values to variables 
            using the assignment operator <code>&lt;-</code> or <code>=</code>.
          </p>

          <div className={styles.codeExample}>
            <h5>Creating Variables:</h5>
            <pre><code>{`# Using the arrow operator (preferred in R)
name <- "Alice"
age <- 25
height <- 5.6

# Using the equals sign
city = "New York"
is_student = TRUE`}</code></pre>
          </div>

          <h4>Data Types in R</h4>
          
          <h5>1. Numeric</h5>
          <p>Numbers with decimal points</p>
          <div className={styles.codeExample}>
            <pre><code>{`price <- 19.99
temperature <- -5.2`}</code></pre>
          </div>

          <h5>2. Integer</h5>
          <p>Whole numbers</p>
          <div className={styles.codeExample}>
            <pre><code>{`count <- 42L
year <- 2024L`}</code></pre>
          </div>

          <h5>3. Character (String)</h5>
          <p>Text data enclosed in quotes</p>
          <div className={styles.codeExample}>
            <pre><code>{`message <- "Welcome to R programming"
color <- 'blue'`}</code></pre>
          </div>

          <h5>4. Logical (Boolean)</h5>
          <p>TRUE or FALSE values</p>
          <div className={styles.codeExample}>
            <pre><code>{`is_raining <- TRUE
is_sunny <- FALSE`}</code></pre>
          </div>

          <h5>5. Complex</h5>
          <p>Numbers with imaginary parts</p>
          <div className={styles.codeExample}>
            <pre><code>{`complex_num <- 3 + 4i`}</code></pre>
          </div>

          <div className={styles.codeExample}>
            <h5>Checking Data Types:</h5>
            <pre><code>{`# Check the type of a variable
class(age)        # "numeric"
class(name)       # "character"
class(is_student) # "logical"`}</code></pre>
          </div>
        </div>
      )
    },
    {
      id: "operators",
      title: "Chapter 3: Operators",
      content: (
        <div className={styles.chapterContent}>
          <h3>Arithmetic Operators</h3>
          <p>Used for mathematical calculations</p>
          
          <div className={styles.codeExample}>
            <pre><code>{`a <- 10
b <- 3

# Addition
sum <- a + b      # 13

# Subtraction
diff <- a - b     # 7

# Multiplication
product <- a * b  # 30

# Division
quotient <- a / b # 3.333333

# Exponentiation (power)
power <- a ^ b    # 1000
power <- a ** b   # 1000 (alternative syntax)

# Modulus (remainder)
remainder <- a %% b  # 1

# Integer division
int_div <- a %/% b  # 3`}</code></pre>
          </div>

          <h3>Relational Operators</h3>
          <p>Used to compare values and return TRUE or FALSE</p>
          
          <div className={styles.codeExample}>
            <pre><code>{`x <- 5
y <- 8

x == y   # FALSE (equal to)
x != y   # TRUE  (not equal to)
x < y    # TRUE  (less than)
x > y    # FALSE (greater than)
x <= y   # TRUE  (less than or equal to)
x >= y   # FALSE (greater than or equal to)`}</code></pre>
          </div>

          <h3>Logical Operators</h3>
          <p>Used to combine or modify logical values</p>
          
          <div className={styles.codeExample}>
            <pre><code>{`p <- TRUE
q <- FALSE

# AND operator - both must be TRUE
p & q    # FALSE
p & p    # TRUE

# OR operator - at least one must be TRUE
p | q    # TRUE
q | q    # FALSE

# NOT operator - reverses the logical value
!p       # FALSE
!q       # TRUE

# Short-circuit versions
p && q   # FALSE (stops at first FALSE)
p || q   # TRUE  (stops at first TRUE)`}</code></pre>
          </div>

          <h3>Assignment Operators</h3>
          <div className={styles.codeExample}>
            <pre><code>{`# Basic assignment
x <- 5
y = 10

# Compound assignment
x <- x + 1    # x becomes 6
x += 1        # x becomes 7 (if supported)`}</code></pre>
          </div>
        </div>
      )
    },
    {
      id: "conditional",
      title: "Chapter 4: Conditional Statements (if-else)",
      content: (
        <div className={styles.chapterContent}>
          <h3>Basic if Statement</h3>
          <p>Execute code only when a condition is TRUE</p>
          
          <div className={styles.codeExample}>
            <pre><code>{`age <- 18

if (age >= 18) {
  print("You are an adult")
}`}</code></pre>
            <p><em>Output: [1] "You are an adult"</em></p>
          </div>

          <h3>if-else Statement</h3>
          <p>Execute different code based on whether condition is TRUE or FALSE</p>
          
          <div className={styles.codeExample}>
            <pre><code>{`temperature <- 25

if (temperature > 30) {
  print("It's hot outside!")
} else {
  print("The weather is pleasant")
}`}</code></pre>
            <p><em>Output: [1] "The weather is pleasant"</em></p>
          </div>

          <h3>if-else if-else Statement</h3>
          <p>Handle multiple conditions</p>
          
          <div className={styles.codeExample}>
            <pre><code>{`score <- 85

if (score >= 90) {
  grade <- "A"
} else if (score >= 80) {
  grade <- "B"
} else if (score >= 70) {
  grade <- "C"
} else if (score >= 60) {
  grade <- "D"
} else {
  grade <- "F"
}

print(paste("Your grade is:", grade))`}</code></pre>
            <p><em>Output: [1] "Your grade is: B"</em></p>
          </div>

          <h3>ifelse() Function</h3>
          <p>A vectorized version of if-else for working with multiple values</p>
          
          <div className={styles.codeExample}>
            <pre><code>{`ages <- c(16, 18, 20, 15, 22)

# Check if each age is 18 or older
status <- ifelse(ages >= 18, "Adult", "Minor")
print(status)`}</code></pre>
            <p><em>Output: [1] "Minor" "Adult" "Adult" "Minor" "Adult"</em></p>
          </div>

          <h3>Nested if Statements</h3>
          <div className={styles.codeExample}>
            <pre><code>{`weather <- "sunny"
temperature <- 25

if (weather == "sunny") {
  if (temperature > 30) {
    print("Perfect beach weather!")
  } else {
    print("Nice day for a walk")
  }
} else {
  print("Stay indoors")
}`}</code></pre>
            <p><em>Output: [1] "Nice day for a walk"</em></p>
          </div>
        </div>
      )
    },
    {
      id: "loops",
      title: "Chapter 5: Loops",
      content: (
        <div className={styles.chapterContent}>
          <h3>for Loop</h3>
          <p>Repeat a block of code a specific number of times</p>
          
          <div className={styles.codeExample}>
            <h5>Basic for loop:</h5>
            <pre><code>{`# Print numbers 1 to 5
for (i in 1:5) {
  print(i)
}`}</code></pre>
            <p><em>Output:</em></p>
            <p><em>[1] 1</em></p>
            <p><em>[1] 2</em></p>
            <p><em>[1] 3</em></p>
            <p><em>[1] 4</em></p>
            <p><em>[1] 5</em></p>
          </div>

          <div className={styles.codeExample}>
            <h5>Loop through a vector:</h5>
            <pre><code>{`fruits <- c("apple", "banana", "orange")

for (fruit in fruits) {
  print(paste("I like", fruit))
}`}</code></pre>
            <p><em>Output:</em></p>
            <p><em>[1] "I like apple"</em></p>
            <p><em>[1] "I like banana"</em></p>
            <p><em>[1] "I like orange"</em></p>
          </div>

          <h3>while Loop</h3>
          <p>Repeat code while a condition is TRUE</p>
          
          <div className={styles.codeExample}>
            <pre><code>{`# Count down from 5
count <- 5

while (count > 0) {
  print(count)
  count <- count - 1
}
print("Blast off!")`}</code></pre>
            <p><em>Output:</em></p>
            <p><em>[1] 5</em></p>
            <p><em>[1] 4</em></p>
            <p><em>[1] 3</em></p>
            <p><em>[1] 2</em></p>
            <p><em>[1] 1</em></p>
            <p><em>[1] "Blast off!"</em></p>
          </div>

          <h3>repeat Loop</h3>
          <p>Repeat code indefinitely until you use break</p>
          
          <div className={styles.codeExample}>
            <pre><code>{`# Generate random numbers until we get 7
repeat {
  number <- sample(1:10, 1)
  print(number)
  if (number == 7) {
    print("Found 7!")
    break
  }
}`}</code></pre>
          </div>

          <h3>Loop Control Statements</h3>
          
          <h5>break Statement</h5>
          <p>Exit the loop immediately</p>
          <div className={styles.codeExample}>
            <pre><code>{`for (i in 1:10) {
  if (i == 5) {
    break
  }
  print(i)
}`}</code></pre>
            <p><em>Output: 1 2 3 4</em></p>
          </div>

          <h5>next Statement</h5>
          <p>Skip the current iteration and continue with the next one</p>
          <div className={styles.codeExample}>
            <pre><code>{`for (i in 1:5) {
  if (i == 3) {
    next
  }
  print(i)
}`}</code></pre>
            <p><em>Output: 1 2 4 5</em></p>
          </div>

          <h3>Nested Loops</h3>
          <div className={styles.codeExample}>
            <pre><code>{`# Create a multiplication table
for (i in 1:3) {
  for (j in 1:3) {
    result <- i * j
    print(paste(i, "x", j, "=", result))
  }
}`}</code></pre>
            <p><em>Output:</em></p>
            <p><em>[1] "1 x 1 = 1"</em></p>
            <p><em>[1] "1 x 2 = 2"</em></p>
            <p><em>[1] "1 x 3 = 3"</em></p>
            <p><em>[1] "2 x 1 = 2"</em></p>
            <p><em>[1] "2 x 2 = 4"</em></p>
            <p><em>[1] "2 x 3 = 6"</em></p>
            <p><em>[1] "3 x 1 = 3"</em></p>
            <p><em>[1] "3 x 2 = 6"</em></p>
            <p><em>[1] "3 x 3 = 9"</em></p>
          </div>
        </div>
      )
    },
    {
      id: "functions",
      title: "Chapter 6: Functions",
      content: (
        <div className={styles.chapterContent}>
          <h3>What are Functions?</h3>
          <p>
            Functions are reusable blocks of code that perform specific tasks. 
            They help organize code and avoid repetition.
          </p>

          <h3>Built-in Functions</h3>
          <p>R comes with many useful built-in functions:</p>
          
          <div className={styles.codeExample}>
            <pre><code>{`# Mathematical functions
numbers <- c(1, 5, 3, 9, 2)

sum(numbers)      # 20
mean(numbers)     # 4
max(numbers)      # 9
min(numbers)      # 1
length(numbers)   # 5

# String functions
text <- "Hello World"
nchar(text)       # 11 (number of characters)
toupper(text)     # "HELLO WORLD"
tolower(text)     # "hello world"`}</code></pre>
          </div>

          <h3>Creating Your Own Functions</h3>
          <p>Use the <code>function()</code> keyword to create custom functions</p>
          
          <div className={styles.codeExample}>
            <h5>Simple function:</h5>
            <pre><code>{`# Function to greet someone
greet <- function(name) {
  paste("Hello,", name, "!")
}

greet("Alice")    # "Hello, Alice !"
greet("Bob")      # "Hello, Bob !"`}</code></pre>
          </div>

          <div className={styles.codeExample}>
            <h5>Function with multiple parameters:</h5>
            <pre><code>{`# Function to calculate area of rectangle
rectangle_area <- function(length, width) {
  area <- length * width
  return(area)
}

rectangle_area(5, 3)  # 15
rectangle_area(10, 4) # 40`}</code></pre>
          </div>

          <div className={styles.codeExample}>
            <h5>Function with default values:</h5>
            <pre><code>{`# Function with default parameter
power <- function(base, exponent = 2) {
  return(base ^ exponent)
}

power(3)        # 9 (uses default exponent of 2)
power(3, 3)     # 27 (uses provided exponent)`}</code></pre>
          </div>

          <h3>Function Scope</h3>
          <p>Variables inside functions are separate from variables outside</p>
          
          <div className={styles.codeExample}>
            <pre><code>{`# Global variable
x <- 10

my_function <- function() {
  # Local variable (only exists inside function)
  x <- 5
  print(paste("Inside function, x =", x))
}

my_function()  # "Inside function, x = 5"
print(paste("Outside function, x =", x))  # "Outside function, x = 10"`}</code></pre>
          </div>

          <h3>Return Values</h3>
          <p>Functions can return values using <code>return()</code> or by placing the value at the end</p>
          
          <div className={styles.codeExample}>
            <pre><code>{`# Function that returns a value
is_even <- function(number) {
  if (number %% 2 == 0) {
    return(TRUE)
  } else {
    return(FALSE)
  }
}

is_even(4)  # TRUE
is_even(7)  # FALSE`}</code></pre>
          </div>
        </div>
      )
    }
  ];

  return (
    <>
      <Head>
        <title>Learn R Programming - GAINS</title>
        <meta name="description" content="Learn the fundamentals of R programming with our interactive tutorial" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Header />

      <div className={styles.learnContainer}>
        <div className={styles.bookContainer}>
          <div className={styles.tableOfContents}>
            <h2>📖 Table of Contents</h2>
            <ul>
              {chapters.map((chapter, index) => (
                <li key={chapter.id}>
                  <button
                    className={styles.chapterButton}
                    onClick={() => toggleChapter(chapter.id)}
                  >
                    <span className={styles.chapterNumber}>{index + 1}</span>
                    <span className={styles.chapterTitle}>{chapter.title}</span>
                    <span className={`${styles.expandIcon} ${expandedChapters[chapter.id] ? styles.expanded : ''}`}>
                      ▼
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.chaptersContainer}>
            {chapters.map((chapter, index) => (
              <div key={chapter.id} className={styles.chapterSection}>
                <button
                  className={`${styles.chapterHeader} ${expandedChapters[chapter.id] ? styles.expanded : ''}`}
                  onClick={() => toggleChapter(chapter.id)}
                >
                  <span className={styles.chapterNumber}>{index + 1}</span>
                  <h2>{chapter.title}</h2>
                  <span className={`${styles.expandIcon} ${expandedChapters[chapter.id] ? styles.expanded : ''}`}>
                    ▼
                  </span>
                </button>
                
                {expandedChapters[chapter.id] && (
                  <div className={styles.chapterBody}>
                    {chapter.content}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className={styles.learnFooter}>
          <h3>🎯 Practice What You've Learned</h3>
          <p>
            Ready to apply your R knowledge? Head over to our R Tools section to create 
            linear regressions, charts, and more with your own data!
          </p>
          <div className={styles.actionButtons}>
            <a href="/linear-regression" className={styles.primaryButton}>
              Try R Tools
            </a>
            <a href="/home" className={styles.secondaryButton}>
              Back to Home
            </a>
          </div>
        </div>
      </div>
    </>
  );
}