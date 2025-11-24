import sql from "./db";
import { db } from "./index";
import { courses, modules, lessons, enrollments, users, lessonChunks } from "./schema";

async function seed() {
  try {
    console.log("Starting database seeding...");

    await sql`CREATE EXTENSION IF NOT EXISTS vector`;

    console.log("Clearing existing data...");
    await db.delete(lessonChunks);
    await db.delete(lessons);
    await db.delete(modules);
    await db.delete(enrollments);
    await db.delete(courses);
    console.log("✓ Cleared existing data");

    const allUsersList = await db.select().from(users);
    const adminUser = allUsersList.find(user => user.email.startsWith('admin_'));

    const courseData = [
      {
        title: "Introduction to Web Development",
        description: "Learn the fundamentals of web development including HTML, CSS, and JavaScript.",
      },
      {
        title: "Advanced React Patterns",
        description: "Master advanced React patterns, hooks, and state management techniques.",
      },
      {
        title: "Database Design Fundamentals",
        description: "Understand relational database design, normalization, and SQL queries.",
      },
      {
        title: "Machine Learning Basics",
        description: "Introduction to machine learning concepts, algorithms, and applications.",
      },
      {
        title: "DevOps and CI/CD",
        description: "Learn about continuous integration, deployment pipelines, and infrastructure as code.",
      },
    ];

    const insertedCourses = await db
      .insert(courses)
      .values(courseData)
      .returning();

    console.log(`✓ Created ${insertedCourses.length} courses`);

    const moduleData = [
      { courseId: insertedCourses[0].id, title: "HTML Basics", order: 1 },
      { courseId: insertedCourses[0].id, title: "CSS Styling", order: 2 },
      { courseId: insertedCourses[0].id, title: "JavaScript Fundamentals", order: 3 },
      { courseId: insertedCourses[1].id, title: "React Hooks", order: 1 },
      { courseId: insertedCourses[1].id, title: "Context API", order: 2 },
      { courseId: insertedCourses[1].id, title: "Performance Optimization", order: 3 },
      { courseId: insertedCourses[2].id, title: "Database Concepts", order: 1 },
      { courseId: insertedCourses[2].id, title: "Normalization", order: 2 },
      { courseId: insertedCourses[2].id, title: "SQL Queries", order: 3 },
      { courseId: insertedCourses[3].id, title: "Introduction to ML", order: 1 },
      { courseId: insertedCourses[3].id, title: "Supervised Learning", order: 2 },
      { courseId: insertedCourses[3].id, title: "Neural Networks", order: 3 },
      { courseId: insertedCourses[4].id, title: "CI/CD Pipelines", order: 1 },
      { courseId: insertedCourses[4].id, title: "Docker Basics", order: 2 },
      { courseId: insertedCourses[4].id, title: "Kubernetes Overview", order: 3 },
    ];

    const insertedModules = await db
      .insert(modules)
      .values(moduleData)
      .returning();

    console.log(`✓ Created ${insertedModules.length} modules`);

    const lessonData = [
      {
        moduleId: insertedModules[0].id,
        title: "HTML Structure and Elements",
        content: "HTML (HyperText Markup Language) is the standard markup language for creating web pages and web applications. It consists of elements that structure content semantically. Basic HTML elements include headings (h1-h6), paragraphs (p), links (a), images (img), lists (ul, ol, li), and semantic elements like header, nav, main, article, section, and footer. Each element has opening and closing tags, with content in between. HTML5 introduced many new semantic elements that help describe the meaning of content, making it more accessible and SEO-friendly. Attributes provide additional information about elements, such as href for links, src for images, and class or id for styling and JavaScript targeting. Understanding HTML structure is fundamental to web development, as it forms the foundation that CSS styles and JavaScript manipulates.",
        order: 1,
      },
      {
        moduleId: insertedModules[0].id,
        title: "Forms and Input Elements",
        content: "HTML forms allow users to input and submit data to servers. Common form elements include text inputs, email inputs, password fields, checkboxes, radio buttons, select dropdowns, textareas, file uploads, and submit buttons. Forms use the action attribute to specify where data is sent and method attribute for HTTP method (GET or POST). The name attribute is crucial for identifying form data on the server side. HTML5 introduced new input types like email, url, tel, date, number, range, and color, which provide better validation and user experience. Form validation can be done client-side using HTML5 validation attributes like required, pattern, min, max, and maxlength. The label element associates text with form controls, improving accessibility. Understanding forms is essential for creating interactive web applications that collect user data.",
        order: 2,
      },
      {
        moduleId: insertedModules[1].id,
        title: "CSS Selectors and Properties",
        content: "CSS (Cascading Style Sheets) controls the visual appearance and layout of HTML elements. Selectors target elements for styling, including element selectors, class selectors (.class), ID selectors (#id), attribute selectors, pseudo-classes (:hover, :focus), and pseudo-elements (::before, ::after). Properties define styling aspects like color, font-size, font-family, margin, padding, border, background, display, position, width, height, and many more. CSS can be applied inline, internally in a style tag, or externally in separate stylesheet files. The cascade determines which styles apply when multiple rules target the same element, based on specificity and source order. Understanding CSS selectors and properties is fundamental to creating visually appealing and responsive web designs.",
        order: 1,
      },
      {
        moduleId: insertedModules[1].id,
        title: "Flexbox and Grid Layout",
        content: "Flexbox and CSS Grid are modern layout systems that revolutionized web design. Flexbox is one-dimensional, perfect for aligning items in rows or columns. It provides properties like flex-direction, justify-content, align-items, flex-wrap, and flex-grow/shrink/basis for controlling item behavior. Grid is two-dimensional, allowing complex layouts with rows and columns simultaneously. Grid uses properties like grid-template-columns, grid-template-rows, grid-gap, grid-area, and grid-column/row for precise control. Both provide powerful tools for responsive design, eliminating the need for float-based layouts and complex positioning. Flexbox excels at component-level layouts, while Grid is ideal for page-level layouts. Mastering both systems enables developers to create flexible, maintainable, and responsive designs that work across all device sizes.",
        order: 2,
      },
      {
        moduleId: insertedModules[2].id,
        title: "Variables and Data Types",
        content: "JavaScript variables store data values and can be declared using let, const, or var. Modern JavaScript prefers let and const over var due to block scoping. const is used for values that won't be reassigned, while let allows reassignment. JavaScript has dynamic typing, meaning variables can hold values of any type. Common data types include numbers (integers and floats), strings (text enclosed in quotes), booleans (true/false), null, undefined, objects (collections of key-value pairs), and arrays (ordered lists). Type coercion can occur when comparing or operating on different types. Understanding types is crucial for writing effective JavaScript code, avoiding bugs, and using appropriate methods. TypeScript adds static typing to JavaScript, providing compile-time type checking and better tooling support.",
        order: 1,
      },
      {
        moduleId: insertedModules[3].id,
        title: "useState Hook",
        content: "The useState hook is React's primary way of managing component state. It returns an array with two elements: the current state value and a function to update it. State updates trigger component re-renders, allowing the UI to reflect data changes. useState can handle primitive values (strings, numbers, booleans) or complex objects and arrays. When updating state based on previous state, use the functional update form to avoid stale closures. Multiple useState calls can be used to manage different pieces of state independently. State should be lifted up to the nearest common ancestor when multiple components need to share it. Understanding useState is fundamental to React development, as most interactive components require state management. It's the foundation for more advanced state management solutions like Context API or external libraries.",
        order: 1,
      },
      {
        moduleId: insertedModules[4].id,
        title: "Creating and Using Context",
        content: "React Context provides a way to pass data through the component tree without prop drilling. Create context with createContext(), provide values with a Provider component, and consume values with the useContext hook. Context is useful for global state like themes, user authentication, language preferences, or any data that many components need. The Provider wraps components that need access to the context value, and any nested component can access it using useContext. Context should be used sparingly, as it can make components harder to test and reason about. For simple cases, prop drilling might be clearer. For complex state management, consider using Context with useReducer or external libraries like Redux or Zustand. Context re-renders all consuming components when the value changes, so optimize with memoization when necessary.",
        order: 1,
      },
      {
        moduleId: insertedModules[5].id,
        title: "React.memo and useMemo",
        content: "Performance optimization in React involves preventing unnecessary re-renders and expensive recalculations. React.memo memoizes components, preventing re-renders when props haven't changed. useMemo memoizes computed values, recalculating only when dependencies change. useCallback memoizes functions, preventing recreation on every render. These tools help optimize expensive operations, reduce render cycles, and improve application performance. However, they should be used judiciously, as they add overhead and can make code more complex. Premature optimization can hurt more than help. Profile your application first to identify actual performance bottlenecks. React DevTools Profiler is invaluable for finding performance issues. Remember that memoization trades memory for computation time, so use it when the computation is expensive or when preventing re-renders is critical.",
        order: 1,
      },
      {
        moduleId: insertedModules[6].id,
        title: "Relational Database Concepts",
        content: "Relational databases organize data into tables with rows (records) and columns (attributes). Tables relate to each other through foreign keys, enabling complex data relationships. Key concepts include primary keys (unique identifiers for rows), foreign keys (references to other tables), relationships (one-to-one, one-to-many, many-to-many), and referential integrity (ensuring data consistency). Normalization reduces data redundancy and improves data integrity by organizing data efficiently. ACID properties (Atomicity, Consistency, Isolation, Durability) ensure reliable transactions. Understanding these concepts is crucial for designing efficient, maintainable databases that scale well and prevent data anomalies. Relational databases use SQL (Structured Query Language) for querying and manipulating data, making them powerful tools for managing structured information.",
        order: 1,
      },
      {
        moduleId: insertedModules[7].id,
        title: "First, Second, and Third Normal Form",
        content: "Database normalization reduces data redundancy and improves data integrity through a series of normal forms. First Normal Form (1NF) eliminates repeating groups by ensuring each cell contains atomic values and each row is unique. Second Normal Form (2NF) removes partial dependencies by ensuring all non-key attributes fully depend on the primary key. Third Normal Form (3NF) eliminates transitive dependencies by ensuring non-key attributes don't depend on other non-key attributes. Higher normal forms (BCNF, 4NF, 5NF) address more complex scenarios. While normalization improves data integrity, over-normalization can hurt query performance, requiring more joins. The goal is finding the right balance between normalization and performance. Understanding normal forms helps design databases that prevent update anomalies, reduce storage, and maintain data consistency.",
        order: 1,
      },
      {
        moduleId: insertedModules[8].id,
        title: "SELECT, INSERT, UPDATE, DELETE",
        content: "SQL provides four main operations for data manipulation: SELECT retrieves data from tables, INSERT adds new records, UPDATE modifies existing records, and DELETE removes records. Each operation has specific syntax and can include WHERE clauses for filtering, JOINs for combining tables, ORDER BY for sorting, GROUP BY for aggregation, and HAVING for filtering groups. SELECT is the most complex, supporting subqueries, unions, and various functions. INSERT can insert single or multiple rows, with or without specifying columns. UPDATE modifies rows matching the WHERE condition, while DELETE removes them. Understanding these operations is fundamental to working with relational databases. Proper use of transactions ensures data consistency, and understanding indexes helps optimize query performance. SQL is a declarative language, meaning you describe what you want, not how to get it.",
        order: 1,
      },
      {
        moduleId: insertedModules[9].id,
        title: "What is Machine Learning?",
        content: "Machine Learning is a subset of artificial intelligence that enables systems to learn from data without explicit programming. It uses algorithms to identify patterns, make predictions, and improve performance through experience. Types include supervised learning (learning from labeled data), unsupervised learning (finding patterns in unlabeled data), and reinforcement learning (learning through trial and error with rewards). Machine learning powers many modern applications like recommendation systems, image recognition, natural language processing, autonomous vehicles, and fraud detection. The process typically involves data collection, preprocessing, feature engineering, model selection, training, evaluation, and deployment. Understanding machine learning concepts is becoming increasingly important as AI becomes more prevalent in technology. It requires knowledge of statistics, linear algebra, and programming, but offers powerful tools for solving complex problems.",
        order: 1,
      },
      {
        moduleId: insertedModules[10].id,
        title: "Linear Regression and Classification",
        content: "Supervised learning uses labeled training data to teach models to make predictions. Linear regression predicts continuous values by finding the best-fit line through data points, minimizing the difference between predicted and actual values. Classification predicts discrete categories or classes. Common algorithms include linear regression for continuous outcomes, logistic regression for binary classification, decision trees for interpretable models, random forests for ensemble methods, support vector machines for complex boundaries, and neural networks for deep learning. Each algorithm has strengths and weaknesses, and choosing the right one depends on the problem, data characteristics, and requirements. Evaluation metrics differ: regression uses mean squared error or R-squared, while classification uses accuracy, precision, recall, and F1-score. Understanding these algorithms is fundamental to machine learning practice.",
        order: 1,
      },
      {
        moduleId: insertedModules[11].id,
        title: "Neural Network Architecture",
        content: "Neural networks consist of layers of interconnected nodes (neurons) that process information. Input layers receive data, hidden layers process it through weighted connections and activation functions, and output layers produce results. Training involves forward propagation (passing data through the network), calculating loss (comparing predictions to actual values), and backpropagation (adjusting weights to minimize error). Deep neural networks have multiple hidden layers, enabling them to learn complex patterns. Convolutional Neural Networks (CNNs) excel at image processing, while Recurrent Neural Networks (RNNs) handle sequential data. Hyperparameters like learning rate, batch size, and network architecture significantly impact performance. Understanding neural network architecture is crucial for deep learning, which powers many modern AI applications including image recognition, natural language processing, and autonomous systems.",
        order: 1,
      },
      {
        moduleId: insertedModules[12].id,
        title: "Setting Up CI/CD Pipelines",
        content: "CI/CD (Continuous Integration/Continuous Deployment) automates software delivery processes. CI involves automatically building and testing code changes whenever developers commit to version control, catching bugs early and ensuring code quality. CD automates deployment to various environments (development, staging, production), reducing manual errors and enabling faster releases. Popular tools include GitHub Actions for GitHub repositories, Jenkins for self-hosted solutions, GitLab CI for integrated GitLab workflows, CircleCI for cloud-based CI/CD, and Azure DevOps for Microsoft ecosystems. A typical pipeline includes steps like code checkout, dependency installation, linting, testing, building, and deployment. Understanding CI/CD is essential for modern software development, enabling teams to deliver features faster, more reliably, and with higher quality. It's a cornerstone of DevOps practices.",
        order: 1,
      },
      {
        moduleId: insertedModules[13].id,
        title: "Docker Containers and Images",
        content: "Docker containerizes applications for consistent deployment across different environments. Images are read-only templates that define application dependencies and configuration, while containers are running instances of images. Dockerfile defines image contents using instructions like FROM, RUN, COPY, and CMD. Docker Compose manages multi-container applications, defining services, networks, and volumes in a YAML file. Containers provide isolation and portability, ensuring applications run the same way on developer machines, CI/CD systems, and production servers. Docker Hub provides a registry for sharing images. Understanding Docker is essential for modern DevOps, as it solves the 'it works on my machine' problem and enables microservices architectures. Containers are lighter than virtual machines, start faster, and use resources more efficiently. Docker has become the standard for containerization, with Kubernetes often orchestrating containers at scale.",
        order: 1,
      },
      {
        moduleId: insertedModules[14].id,
        title: "Kubernetes Basics",
        content: "Kubernetes orchestrates containerized applications at scale, managing deployment, scaling, and operations. Key concepts include pods (smallest deployable units, containing one or more containers), services (networking layer providing stable endpoints), deployments (managing replica sets and rolling updates), and namespaces (logical separation of resources). Kubernetes handles automatic scaling based on load, load balancing across pods, self-healing by restarting failed containers, and rolling updates with zero downtime. It provides declarative configuration through YAML files, allowing you to describe desired state rather than imperative commands. Understanding Kubernetes is crucial for managing containerized applications in production, especially for microservices architectures. It's complex but powerful, abstracting away infrastructure concerns and enabling developers to focus on applications. Kubernetes has become the de facto standard for container orchestration.",
        order: 1,
      },
    ];

    const insertedLessons = await db
      .insert(lessons)
      .values(lessonData)
      .returning();

    console.log(`✓ Created ${insertedLessons.length} lessons`);

    const allUsers = await db.select().from(users).limit(5);
    
    if (allUsers.length > 0) {
      const enrollmentData = allUsers.slice(0, Math.min(5, allUsers.length)).map((user, index) => ({
        userId: user.id,
        courseId: insertedCourses[index % insertedCourses.length].id,
        enrolledBy: adminUser?.id || null,
      }));

      await db.insert(enrollments).values(enrollmentData);
      console.log(`✓ Created ${enrollmentData.length} enrollments`);
    }

    console.log("✓ Database seeding completed successfully!");
    process.exit(0);
  } catch (error: any) {
    console.error("✗ Seeding failed:", error.message);
    console.error(error);
    process.exit(1);
  }
}

seed();

