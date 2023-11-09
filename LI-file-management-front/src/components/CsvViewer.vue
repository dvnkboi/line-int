<template>
  <table ref="table" class="border-collapse table-auto w-full">
    <thead>
      <tr ref="tableHeader" class="shadow-md rounded-2xl">
        <th align="left" class="capitalize h-10 px-2 overflow-hidden bg-primary text-primary-foreground"
          v-for="(header, index) in data.header" :key="index">{{ header }}
        </th>
      </tr>
    </thead>
    <tbody class="">
      <tr v-for="(row, index) in data.rows" :key="index">
        <td class="px-2 h-8 bg-muted text-muted-foreground" v-for="(item, index) in row" :key="index">{{ item }}
        </td>
      </tr>
    </tbody>
  </table>
</template>
  
<script setup lang='ts'>
import { getDataFromCSV } from '../utils/data/csvManager';
import { computed, ref, onMounted } from 'vue';

let scrollableParent: HTMLElement = null;
const table = ref<HTMLTableElement>();
const tableHeader = ref<HTMLTableElement>();

const props = defineProps<{
  csvString: string;
}>();

const data = computed(() => {
  return getDataFromCSV(props.csvString);
});

onMounted(() => {
  scrollableParent = table.value?.parentElement;
  scrollableParent.addEventListener('scroll', () => {
    tableHeader.value.animate({
      transform: `translateY(${scrollableParent.scrollTop}px)`
    }
      , {
        duration: 600,
        easing: 'ease-in-out',
        fill: 'both',
      });
  });
});



</script>
  
<style>
  
table tbody tr:first-child td:first-child {
  @apply rounded-tl-2xl;
}

table tbody tr:first-child td:last-child {
  @apply rounded-tr-2xl;
}

table tbody tr:last-child td:first-child {
  @apply rounded-bl-2xl;
}

table tbody tr:last-child td:last-child {
  @apply rounded-br-2xl;
}

table thead tr:first-child th:first-child {
  @apply rounded-l-2xl;
}

table thead tr:first-child th:last-child {
  @apply rounded-r-2xl;
}


tbody:before {line-height:0.5em; content:"\200C"; display:block;}
</style>