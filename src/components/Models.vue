<template>
  <div id="models-container">
    <h3>Models</h3>
    <table>
      <coldef>
        <col />
        <col style="width: 0" />
      </coldef>
      <tbody id="models">
        <tr v-for="model in models" :key="model">
          <td>{{ model }}</td>
          <td></td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script lang="ts">
import { Options, Vue } from "vue-class-component";
import { ModelManager } from "../modelManager";

@Options({
  props: {
    models: [],
  },
})
export default class Models extends Vue {
  models: string[] = [];

  public async populateModelList(): Promise<void> {
    this.models = await ModelManager.getModelList();
  }
}
</script>

<style scoped>
</style>
