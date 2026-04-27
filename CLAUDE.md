# CLAUDE.md

Hello and welcome to my app `Statster`. 

When working on this app together I want us to discuss the planned changes before we make any edits. This way I can help spot potential bugs or misunderstandings. 

## Project

**Statster** is a React Native / Expo mobile app for tracking personal progress and statistics. For example the skill we're focused on during development is disc golf, where the user can track anything from how good it is at forehand anhyzer throws, to putting and different courses. You can choose to enter as much or as little data you want while playing and then 

The power of the app lies in the very generic and powerful schema and interface that allows the user to track whatever parameter it cares about for each individual skill. Each "skill" is an isolated workspace with its own SQLite database, parameters, forms, and entry tracking even though they all share the same schema.