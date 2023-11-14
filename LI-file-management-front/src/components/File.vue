<template>
  <div v-if="filePreview"
    class="file bg-muted text-muted-foreground rounded-2xl pt-2 flex justify-start items-start flex-col gap-2 overflow-hidden group hover:shadow-lg hover:shadow-primary transition-all duration-300 hover:scale-105 cursor-pointer relative"
    @click="downloadFile(filePreview)">
    <div
      class="absolute left-0 right-0 bottom-0 p-2 z-50 flex justify-center items-center translate-y-4 group-hover:translate-y-0 group-hover:opacity-100 group-hover:pointer-events-auto opacity-0 pointer-events-none transition duration-300">
      <div @click.prevent.stop="emit('deleteFile', filePreview)"
        class="bg-destructive text-destructive-foreground px-4 py-1 rounded-xl font-bold ring-destructive ring-0 hover:ring-2 group hover:-translate-y-1 transition duration-500">
        <div class="group-hover:-translate-y-0.5 transition duration-500">delete</div>
      </div>
    </div>
    <h2
      class="font-bold text-xl px-4 group-hover:translate-x-2 group-hover:translate-y-1 transition duration-500 origin-top-left group-hover:scale-110">
      {{ filePreview.filePath }}
    </h2>
    <div v-if="filePreview.type == 'text'"
      class="whitespace-pre-line aspect-[16/10] h-72 bg-background text-background-foreground shadow-2xl shadow-black rounded-2xl px-4 py-2 group-hover:scale-90 group-hover:-translate-y-2 transition duration-500">
      {{ filePreview.content }}
    </div>
    <div v-if="filePreview.type == 'csv'"
      class="overflow-auto aspect-[16/10] h-72 bg-background text-background-foreground shadow-2xl shadow-black rounded-2xl px-4 py-2 group-hover:scale-90 group-hover:-translate-y-2 transition duration-500">
      <CsvViewer :csvString="filePreview.content" />
    </div>
    <img v-if="filePreview.type == 'image'" :src="filePreview.content" :alt="filePreview.type" loading="lazy"
      class="aspect-[16/10] object-contain h-72 bg-background text-background-foreground shadow-2xl shadow-black rounded-2xl px-4 py-2 group-hover:scale-90 group-hover:-translate-y-2 transition duration-500">
  </div>
  <div v-intersection-observer="[onIntersectionObserver, { threshold: 0.1 }]" v-else
    class="file bg-muted text-muted-foreground rounded-2xl pt-2 flex justify-start items-start transition-all duration-300 flex-col">
    <h2
      class="font-bold text-xl px-4 group-hover:translate-x-2 group-hover:translate-y-1 transition duration-500 origin-top-left group-hover:scale-110">
      {{ file.filePath }}
    </h2>
    <div class="aspect-[16/10] h-72 flex justify-center items-center">
      <div
        class="w-full h-full animate-pulse bg-background text-background-foreground shadow-2xl shadow-black rounded-2xl px-4 py-2 group-hover:scale-90 group-hover:-translate-y-2 transition duration-1000">
      </div>
    </div>
  </div>
</template>
  
<script setup lang='ts'>
import { onMounted, ref } from 'vue';
import { DiscoveredFile, FilePreviewType, getFile, getFilePreview } from '../utils/requests/fileManager';
import CsvViewer from './CsvViewer.vue';
import { vIntersectionObserver } from '@vueuse/components';


const props = defineProps<{
  file: DiscoveredFile;
  visible: boolean;
}>();

const filePreview = ref<FilePreviewType>(null);

const emit = defineEmits({
  deleteFile: (file: FilePreviewType) => true
});

const downloadFile = async (file: FilePreviewType | DiscoveredFile) => {
  await getFile(file.filePath);
};

const onIntersectionObserver: IntersectionObserverCallback = async (entries: IntersectionObserverEntry[]) => {
  if (entries[0].isIntersecting) {
    filePreview.value = await getFilePreview(props.file.filePath);
  }
};

</script>
  
<style scoped>

.file {
  content-visibility: auto;
  contain-intrinsic-size: 0px 20rem;
}
  
</style>