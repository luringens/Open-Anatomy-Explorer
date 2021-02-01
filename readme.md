# Open Anatomy Explorer

The Open Anatomy Explorer is a web-based viewer for studying anatomy. It is based on real 3D-surface
scanned human anatomy and provides tools to label regions of the models in a live 3D view that
students can freely interact with. In contrast to existing solutions, which are often based on
meshes designed by artists, our application is based on surface scanned specimens, which have
realistic shapes and textures. The main goals of this anatomical online resource is to serve as an
educational platform available to anyone with access to a modern web browser. To facilitate this, it
provides a “flash-card” like quiz system that allows students and lecturers to set up quizzes
regarding the displayed anatomy, such as naming points and regions or locating them from their name
only. In this way, the system is set up both to be used as a reference for students as they are
learning, as well as for assessment in an exam context.

This is the front-end for the project. For the backend, see
[Open-Anatomy-Explorer-Backend](https://github.com/stisol/Open-Anatomy-Explorer-Backend).

## Ideas for future improvement

- Orientation questions
- Link labels to information sites
- Read-only quizzes

## Compiling

```sh
yarn build
```

If you wish to run it with live reload:

```sh
# First setup
npm install -g browser-sync

# Running (in parallel)
yarn watch
yarn start
```
