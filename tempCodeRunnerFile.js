// MongoDB Playground
// Use Ctrl+Space inside a snippet or a string literal to trigger completions.

// The current database to use.
use('ats');

// Create a new document in the collection.
db.getCollection('roles').insertOne({
    name: "hiringManager",
    description: "The hiringManager is responsible for managing job postings, overseeing candidate evaluations, scheduling interviews, etc. They have full access to the recruitment process and can perform most administrative functions, excluding platform-wide settings reserved for admins."
});
