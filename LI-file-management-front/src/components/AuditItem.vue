<template>
  <div class="w-full px-2 py-1 rounded-xl shadow-xl flex justify-start items-start flex-col relative"
    :class="[operationTypeColor]">
    <h1 class="font-bold text-2xl">{{ item.username }}</h1>
    <h3 class="font-bold text-lg flex justify-between items-end flex-wrap gap-x-2 content-start w-full">{{
      item.currentOperation }}
      <span class="text-sm mb-0.5">{{ item.date }}</span>
    </h3>

  </div>
</template>
  
<script setup lang='ts'>
import { computed } from 'vue';

type ClientOperation = {
  username: string;
  status: 'online' | 'offline';
  currentOperation: string;
  operationType: 'create' | 'delete' | 'download' | 'update';
  date: Date;
};

const props = defineProps<{
  item: ClientOperation;
}>();

const operationTypeColor = computed(() => {
  if (props.item.operationType == 'delete') {
    return 'bg-destructive text-destructive-foreground';
  }
  if (props.item.operationType == 'create') {
    return 'bg-primary text-primary-foreground';
  }
  if (props.item.operationType == 'download') {
    return 'bg-background text-background-foreground';
  }
  if (props.item.operationType == 'update') {
    return 'bg-accent text-accent-foreground';
  }
});

</script>
  
<style>
  
</style>