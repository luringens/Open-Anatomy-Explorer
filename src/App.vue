<template>
  <div class="grid">
    <div id="canvas-container" class="canvas-container"></div>
    <div class="sidebar">
      <Tools />
      <Models />
    </div>
  </div>
</template>

<script lang="ts">
import { Options, Vue } from "vue-class-component";
import Tools from "./components/Tools.vue";
import Models from "./components/Models.vue";

@Options({
  components: {
    Tools,
    Models,
  },
})
export default class App extends Vue {
  public components = {
    tools: Tools,
    models: Models,
  };

  public async initialize(): Promise<void> {
    await this.components.models.populateModelList();
  }
}
</script>

<style>
body,
html {
  margin: 0;
  padding: 0;
  height: 100%;
}

canvas {
  position: absolute;
  width: 100%;
  height: 100%;
}

h1,
h2,
h3,
h4,
p,
pre,
th,
td,
label {
  font-family: Arial, Helvetica, sans-serif;
}

table {
  width: 100%;
  border-collapse: collapse;
}

table,
th,
td {
  border: 1px solid #e7e7e7;
}

button {
  background-color: #3399ff;
  border: none;
  color: white;
  padding: 5px;
  text-align: center;
  text-decoration: none;
  display: inline-block;
  font-size: 14px;
  width: 100%;
  margin: 0, 0, 5px, 0;
}

.grid {
  display: grid;
  grid-template-columns: auto 350px;
  grid-template-rows: 100%;
  grid-gap: 0px;
  height: 100%;
}

.canvas-container {
  grid-column: 1;
  height: 100%;
}

.sidebar {
  padding: 15px;
  background: #282828;
  color: #e7e7e7;
  overflow-y: auto;
  overflow-x: hidden;
}

.dg {
  float: right;
  z-index: 100;
  position: relative;
}

.btn-remove {
  margin: 0;
}

.label-name {
  background: #282828;
  color: #e7e7e7;
  font-size: 15px;
  border: none;
  height: 100%;
  padding: 5px 2px;
  margin: 0;
}

@keyframes example {
  from {
    background-color: red;
  }
  to {
    background-color: #282828;
  }
}

.row-animate input {
  animation-name: example;
  animation-duration: 3s;
}

.hide {
  display: none;
  visibility: hidden;
}

.question-editor {
  border: solid 2px grey;
  margin-bottom: 5px;
  padding: 3px;
}

.question-editor h3 {
  margin-top: 0.25em;
}

.question-editor a {
  float: right;
  text-decoration: none;
}

textarea {
  width: 98%;
  resize: vertical;
}

.correct {
  color: greenyellow;
  font-weight: bold;
}

.wrong {
  color: pink;
  font-weight: bold;
}

#quizzer-result-table td {
  padding: 3px;
}

#quizzer-result-table td,
th {
  padding: 3px;
}

th {
  text-align: left;
}

#app {
  height: 100%;
  /* font-family: Avenir, Helvetica, Arial, sans-serif; */
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  /* text-align: center; */
  /* color: #2c3e50; */
  /* margin-top: 60px; */
}
</style>
