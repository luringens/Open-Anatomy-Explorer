<template>
  <div id="tool-container">
    <h3>Tools</h3>

    <input
      type="radio"
      id="tool-camera"
      name="tool"
      value="camera"
      v-model="selectedTool"
    />
    <label for="tool-camera">Camera</label><br />

    <input
      type="radio"
      id="tool-picker"
      name="tool"
      value="picker"
      v-model="selectedTool"
    />
    <label for="tool-labeler" id="tool-picker-label">Picker</label><br />

    <div id="tool-group-labeller" class="hide">
      <input
        type="radio"
        id="tool-labeler"
        name="tool"
        value="labeler"
        v-model="selectedTool"
      />
      <label for="tool-labeler">Label painter</label><br />

      <input
        type="radio"
        id="tool-unlabeler"
        name="tool"
        value="unlabeler"
        v-model="selectedTool"
      />
      <label for="tool-unlabeler">Label remover</label><br />
    </div>
  </div>
</template>

<script lang="ts">
import { Options, Vue } from "vue-class-component";

@Options({
  props: {
    selectedTool: null,
  },
})
export default class Tools extends Vue {
  selectedTool: Tool = Tool.Camera;
}

enum Tool {
  Camera = "camera",
  Picker = "picker",
  Labeller = "labeler",
  Unlabeller = "unlabeler",
}
</script>

<style scoped>
</style>
