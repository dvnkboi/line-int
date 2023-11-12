<template>
  <div class="h-full relative overflow-auto">
    <transition name="fade" appear>
      <div
        v-if="folderCreationModal.isFocusedPremature.value || showingDeleteConfirmationFor !== '' || auditModal.isFocusedPremature.value"
        class="fixed inset-0 bg-background z-50 bg-opacity-75 transition duration-500 flex justify-center items-center">
        <div ref="deleteConfirmationContainer" v-if="showingDeleteConfirmationFor !== ''"
          class="bg-muted text-muted-foreground relative transition-all duration-500 shadow-xl rounded-2xl px-4 py-4 max-w-md">
          <h1 class="font-bold text-2xl group-hover:translate-x-3 group-hover:scale-105 transition duration-500">
            Deleting {{ deletingType }}
          </h1>
          <h2 class="font-bold text-xl opacity-50 group-hover:translate-x-2 transition duration-500">
            You are deleting {{ showingDeleteConfirmationFor }}, are you sure?
          </h2>
          <div class="w-full transition duration-500 flex justify-center items-center pt-4">
            <div @click="deleteHandler(showingDeleteConfirmationFor, deletingType == 'folder' ? 'folder' : 'file')"
              class="bg-destructive text-destructive-foreground px-4 py-1 rounded-xl ring-destructive ring-0 hover:ring-2 group hover:-translate-y-1 transition duration-500">
              <h1
                class="pointer-events-auto cursor-pointer font-bold text-xl group-hover:-translate-y-0.5 transition duration-500">
                delete
              </h1>
            </div>
          </div>
        </div>
      </div>
    </transition>
    <div ref="appContainer" class="flex-col flex justify-start items-start gap-10 px-6 py-6">
      <div class="fixed bottom-4 right-4 z-50">
        <div ref="auditContainer">
          <div ref="auditCard" @click="auditModal.focus()"
            :class="[auditModal.isFocusedPremature.value ? 'bg-muted text-muted-foreground overflow-auto' : 'bg-primary text-primary-foreground group cursor-pointer overflow-hidden']"
            class="transition-all duration-500 shadow-xl rounded-xl px-3 py-1 max-w-xl">
            <div class="flex justify-start items-start flex-col gap-1 relative w-full h-full">
              <h1 :class="[auditModal.isFocusedPremature.value ? 'text-2xl' : 'text-lg']"
                class="font-semibold group-hover:-translate-y-1 group-hover:-translate-x-1 group-hover:scale-105 transition-all duration-500">
                audit
              </h1>
              <Transition name="fade-x" appear mode="out-in">
                <h2 v-if="auditModal.isFocusedPremature.value"
                  class="font-bold text-xl opacity-80 mt-2 transition duration-500">
                  This is a detailed view of file operations
                </h2>
              </Transition>
              <Transition name="fade-x" appear>
                <div class="transition duration-500 flex flex-col justify-start items-start gap-4 px-2 w-full"
                  v-if="auditModal.isFocusedPremature.value">
                  <AuditItem v-for="(item, index) in eventLog" :key="index" :item="item">
                  </AuditItem>
                </div>
              </Transition>
            </div>
          </div>
        </div>
      </div>
      <transition name="fade-x" appear>
        <div v-if="updatingFiles"
          class="fixed bottom-4 right-4 left-4 flex justify-center items-center z-50 pointer-events-none">
          <div class="bg-muted text-muted-foreground rounded-2xl shadow-xl px-2 py-2 font-bold">
            processing {{ progress.toFixed(0) }}%
          </div>
        </div>
      </transition>
      <div class="h-16 flex justify-between items-center px-4 w-full bg-card text-card-foreground shrink-0 rounded-xl">
        <div class="flex justify-start items-center gap-1 relative">
          <transition name="fade-x" appear>
            <button v-if="!isRootPath" @click="goBack"
              class="bg-primary text-primary-foreground px-3 py-1 rounded-xl font-bold ring-primary ring-0 hover:ring-2 group hover:-translate-y-1 transition duration-500">
              <div class="group-hover:-translate-y-0.5 transition duration-500">back</div>
            </button>
          </transition>
          <transition name="fade-x" appear mode="out-in">
            <h1 :key="currentPath" class="transition duration-500 absolute w-64 truncate left-full ml-2">
              {{ currentPath }}
            </h1>
          </transition>
        </div>
        <div>
          <input
            class="bg-input text-muted-foreground rounded-3xl focus:rounded-xl font-semibold ring-0 focus:ring-primary focus:ring-2 ring-primary focus:outline-none outline-none border-none focus:border-none focus:px-4 transition-all duration-500"
            placeholder="search" type="text" v-model="searchInput">
        </div>
        <img src="./assets/logo.png" class="h-16 w-16 rounded-lg" alt="">
      </div>
      <div ref="folderContainer"
        class="bg-card text-card-foreground shadow-xl rounded-2xl flex justify-start items-start flex-wrap gap-6 flex-row content-start px-6 py-6 w-full transition duration-500 relative">
        <div ref="folderCreationContainer">
          <div ref="folderCreationCard" @click="folderCreationModal.focus()"
            :class="[folderCreationModal.isFocusedPremature.value ? 'bg-muted text-muted-foreground' : 'bg-primary text-primary-foreground group cursor-pointer']"
            class="transition-all duration-500 shadow-xl rounded-2xl px-4 py-4 max-w-md">
            <div class="flex justify-start items-start flex-col gap-1 relative w-full h-full">
              <h1 class="font-bold text-2xl group-hover:translate-x-3 group-hover:scale-105 transition duration-500">
                Create Folder</h1>
              <Transition name="fade-x" appear mode="out-in">
                <h2 v-if="!folderCreationModal.isFocusedPremature.value"
                  class="font-bold text-xl opacity-50 group-hover:translate-x-2 transition duration-500">
                  Click here to create a folder
                </h2>
                <h2 v-else class="font-bold text-xl opacity-80 mt-2 transition duration-500">
                  Name your folder
                </h2>
              </Transition>
              <Transition name="fade-x" appear>
                <input v-if="folderCreationModal.isFocusedPremature.value" @keydown="handleCreateFolderInput" autofocus
                  class="absolute top-20 bg-input text-muted-foreground rounded-3xl focus:rounded-xl font-semibold ring-0 focus:ring-primary focus:ring-2 ring-primary focus:outline-none outline-none border-none focus:border-none focus:px-4 transition-all duration-500 w-full text-xl"
                  placeholder="Folder name" type="text" v-model="folderName">
              </Transition>
              <Transition name="fade-x" appear>
                <div v-if="folderCreationModal.isFocusedPremature.value"
                  class="absolute bottom-0 w-full transition duration-500 flex justify-center items-center">
                  <div class="bg-primary text-primary-foreground px-4 py-1 rounded-xl">
                    <h1 @click="createFolderHandler" class="pointer-events-auto cursor-pointer font-bold text-xl">
                      Create
                    </h1>
                  </div>
                </div>
              </Transition>
            </div>
          </div>
        </div>
        <TransitionGroup name="list-fade-x" @beforeLeave="listAnimationFix">
          <div v-for="(folder, _) in discoveredFolders" :key="folder.filePath" @click="listFiles(folder.filePath)"
            class="bg-muted text-muted-foreground shadow-xl rounded-2xl px-4 py-4 flex justify-center items-start flex-col gap-1 flex-grow max-w-sm cursor-pointer group hover:scale-105 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
            <h2 class="font-bold text-2xl group-hover:translate-x-3 group-hover:scale-105 transition duration-500">
              {{ folder.fileName }}
            </h2>
            <h2 class="font-bold text-lg opacity-50 group-hover:translate-x-2 transition duration-500">
              {{ folder.filePath }}
            </h2>
            <div
              class="absolute right-0 top-0 bottom-0 p-2 flex justify-center items-center translate-x-4 group-hover:translate-x-0 group-hover:opacity-100 group-hover:pointer-events-auto opacity-0 pointer-events-none transition duration-300">
              <div @click.prevent.stop="showDeleteConfirmation(folder.filePath, 'folder')"
                class="bg-destructive text-destructive-foreground px-4 py-1 rounded-xl font-bold ring-destructive ring-0 hover:ring-2 group hover:-translate-y-1 transition duration-500">
                <div class="group-hover:-translate-y-0.5 transition duration-500">delete</div>
              </div>
            </div>
          </div>
        </TransitionGroup>
      </div>
      <div class="bg-card text-card-foreground shadow-xl rounded-2xl px-6 py-6 w-full relative">
        <div class="absolute right-6 top-0 -translate-y-1/2">
          <input ref="fileInput" type="file" multiple @change="fileUploadHandler" class="hidden">
          <button
            class="bg-primary text-primary-foreground px-3 py-1 rounded-xl font-bold ring-primary ring-0 hover:ring-2 group hover:-translate-y-1 transition duration-500">
            <div @click="fileInput.click()" class="group-hover:-translate-y-0.5 transition duration-500">Upload</div>
          </button>
        </div>
        <div v-if="Object.keys(files).length > 0"
          class="flex justify-start items-start flex-wrap gap-6 flex-row content-start" ref="fileContainer">
          <TransitionGroup name="list-fade-x" @beforeLeave="listAnimationFix">
            <div v-for="(file, index) in files" :key="index">
              <div
                class="bg-muted text-muted-foreground rounded-2xl pt-2 flex justify-start items-start flex-col gap-2 overflow-hidden group hover:shadow-lg hover:shadow-primary transition-all duration-300 hover:scale-105 cursor-pointer relative"
                @click="downloadFile(file)">
                <div
                  class="absolute left-0 right-0 bottom-0 p-2 z-50 flex justify-center items-center translate-y-4 group-hover:translate-y-0 group-hover:opacity-100 group-hover:pointer-events-auto opacity-0 pointer-events-none transition duration-300">
                  <div @click.prevent.stop="showDeleteConfirmation(file.filePath, 'file')"
                    class="bg-destructive text-destructive-foreground px-4 py-1 rounded-xl font-bold ring-destructive ring-0 hover:ring-2 group hover:-translate-y-1 transition duration-500">
                    <div class="group-hover:-translate-y-0.5 transition duration-500">delete</div>
                  </div>
                </div>
                <h2
                  class="font-bold text-xl px-4 group-hover:translate-x-2 group-hover:translate-y-1 transition duration-500 origin-top-left group-hover:scale-110">
                  {{ file.filePath }}
                </h2>
                <div v-if="file.type == 'text'"
                  class="whitespace-pre-line aspect-[16/10] h-72 bg-background text-background-foreground shadow-2xl shadow-black rounded-2xl px-4 py-2 group-hover:scale-90 group-hover:-translate-y-2 transition duration-500">
                  {{ file.content }}
                </div>
                <div v-if="file.type == 'csv'"
                  class="overflow-auto aspect-[16/10] h-72 bg-background text-background-foreground shadow-2xl shadow-black rounded-2xl px-4 py-2 group-hover:scale-90 group-hover:-translate-y-2 transition duration-500">
                  <CsvViewer :csvString="file.content" />
                </div>
                <img v-if="file.type == 'image'" :src="file.content" :alt="file.type" loading="lazy"
                  class="aspect-[16/10] object-contain h-72 bg-background text-background-foreground shadow-2xl shadow-black rounded-2xl px-4 py-2 group-hover:scale-90 group-hover:-translate-y-2 transition duration-500">
              </div>
            </div>
          </TransitionGroup>
        </div>
        <h1 v-else class="font-bold">No files found 😢</h1>
      </div>
    </div>

  </div>
</template>
  
<script setup lang='ts'>
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { getFiles, getFilePreview, FilePreviewType, FileArrayResponse, DiscoveredFile, getFile, searchFiles, createFolder, join, deleteFolder, uploadFiles, deleteFile, uploadFilesXHR } from './utils/requests/fileManager';
import CsvViewer from './components/CsvViewer.vue';
import { genericAnimation, listAnimationFix } from './utils/theme/index';
import { useAutoAnimate } from '@formkit/auto-animate/vue';
import { useAnimatedModal } from './composables/useAnimatedModal';
import { onClickOutside } from '@vueuse/core';
import { Subscriber } from './utils/events/subscription';
import { Exception } from './utils/error';
import AuditItem from './components/auditItem.vue';


const discoveredFiles = ref<{ [filePath: string]: DiscoveredFile; }>({});
const discoveredFolders = ref<{ [filePath: string]: DiscoveredFile; }>({});
const files = ref<{ [filePath: string]: FilePreviewType; }>({});
const currentPath = ref(localStorage.getItem('currentPath') ?? '');
const isRootPath = ref(false);
const showingDeleteConfirmationFor = ref('');
const [appContainer] = useAutoAnimate(genericAnimation());
// const [folderContainer] = useAutoAnimate(genericAnimation());
// const [fileContainer] = useAutoAnimate(genericAnimation());
const searchInput = ref('');
const folderName = ref('');
const folderCreationContainer = ref<HTMLElement>();
const folderCreationCard = ref<HTMLElement>();
const auditContainer = ref<HTMLElement>();
const auditCard = ref<HTMLElement>();
const deleteConfirmationContainer = ref<HTMLElement>();
const fileInput = ref<HTMLInputElement>();
const deletingType = ref<'file' | 'folder' | ''>('');
const eventLog = ref<ClientOperation[]>([]);
let updatingFiles = ref(false);
const progress = ref(0);

onClickOutside(deleteConfirmationContainer, () => {
  showingDeleteConfirmationFor.value = '';
});

const folderCreationModal = useAnimatedModal(folderCreationCard, folderCreationContainer, {
  closeOnClickOutside: true,
  height: '13rem',
  width: '90%',
});


const auditModal = useAnimatedModal(auditCard, auditContainer, {
  closeOnClickOutside: true,
  height: '90%',
  width: '90%',
});


watch(searchInput, (input) => {
  search(input);
});


onMounted(async () => {
  setTimeout(async () => {
    await listFiles(currentPath.value);
  }, 100);
});


const downloadFile = async (file: FilePreviewType) => {
  await getFile(file.filePath);
};

const listFiles = async (dir = '/') => {
  const fileArray = await getFiles(dir);
  files.value = {};

  // convert arr to obj
  discoveredFiles.value = fileArray.files.filter(file => !file.isDirectory).reduce((acc: Record<string, DiscoveredFile>, file) => {
    acc[file.filePath] = file;
    return acc;
  }, {});
  discoveredFolders.value = fileArray.files.filter(file => file.isDirectory).reduce((acc: Record<string, DiscoveredFile>, file) => {
    acc[file.filePath] = file;
    return acc;
  }, {});

  for (const file of Object.values(discoveredFiles.value)) {
    const preview = await getFilePreview(file.filePath);
    if (preview.content == null || preview.content.trim() == '') continue;
    files.value[preview.filePath] = preview;
  }

  localStorage.setItem('currentPath', dir);
  currentPath.value = dir;

  if (dir == '/' || dir == '') isRootPath.value = true;
  else isRootPath.value = false;
};

const goBack = async () => {
  let currentPath = localStorage.getItem('currentPath');
  if (currentPath == '/') return await listFiles('/');
  if (currentPath == null) return await listFiles('/');
  if (currentPath.charAt(currentPath.length - 1) == '/') currentPath = currentPath.slice(0, -1);
  const pathArray = currentPath.split('/');
  pathArray.pop();
  const newPath = pathArray.join('/');
  await listFiles(newPath);
};

let searchTimeout: number = null;
const search = (input: string) => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(async () => {
    if (input == '') {
      await listFiles(currentPath.value);
      return;
    }
    files.value = {};
    const searchResults = await searchFiles(input, []);

    discoveredFiles.value = searchResults.files.filter(file => !file.item.isDirectory).map(file => file.item).reduce((acc: Record<string, DiscoveredFile>, file) => {
      acc[file.filePath] = file;
      return acc;
    }, {});
    discoveredFolders.value = searchResults.files.filter(file => file.item.isDirectory).map(file => file.item).reduce((acc: Record<string, DiscoveredFile>, file) => {
      acc[file.filePath] = file;
      return acc;
    }, {});

    for (const file of Object.values(discoveredFiles.value)) {
      const preview = await getFilePreview(file.filePath);
      if (preview.content == null || preview.content.trim() == '') continue;
      files.value[preview.filePath] = preview;
    }

  }, 500);
};

const handleCreateFolderInput = async (event: KeyboardEvent) => {
  if (event.key == 'Enter') {
    await createFolderHandler();
  }
};

const createFolderHandler = async () => {
  updatingFiles.value = true;
  folderCreationModal.unfocus();

  const folder = await createFolder(join(currentPath.value, folderName.value));
  if (Exception.isException(folder)) {
    alert(folder.errorMessage);
    return;
  }
  const exists = discoveredFolders.value[join(currentPath.value, folderName.value)];
  if (exists != null) return;
  discoveredFolders.value[join(currentPath.value, folderName.value)] = folder;
  updatingFiles.value = false;
};

const deleteHandler = async (path: string, type: 'folder' | 'file' = 'file') => {
  updatingFiles.value = true;
  if (type == 'folder') {
    const deleteResp = await deleteFolder(path);
    if (Exception.isException(deleteResp)) {
      alert(deleteResp.errorMessage);
      return;
    }
    delete discoveredFolders.value[path];
  }
  else {
    const deleteResp = await deleteFile(path);
    if (Exception.isException(deleteResp)) {
      alert(deleteResp.errorMessage);
      return;
    }
    delete discoveredFiles.value[path];
    delete files.value[path];
  }
  showingDeleteConfirmationFor.value = '';
  updatingFiles.value = false;
};

const showDeleteConfirmation = (path: string, type: 'folder' | 'file' = 'file') => {
  showingDeleteConfirmationFor.value = path;
  deletingType.value = type;
};

const fileUploadHandler = async () => {
  updatingFiles.value = true;
  const resp = await uploadFilesXHR(currentPath.value, fileInput.value.files, (progressVal) => {
    progress.value = progressVal * 100;
  });
  if (Exception.isException(resp)) {
    alert(resp.errorMessage);
    return;
  }
  await listFiles(currentPath.value);
  updatingFiles.value = false;
};


type ClientOperation = {
  username: string;
  status: 'online' | 'offline';
  currentOperation: string;
  operationType: 'create' | 'delete' | 'download' | 'update';
  file: DiscoveredFile;
  date: Date;
};

// subscribe to audit log

Subscriber.subscribe('api', 'events:audit');

Subscriber.on<ClientOperation>('events:audit', async (payload) => {
  const operation = payload.message;
  if (Exception.isException(operation)) return;
  const alreadyProcessed = eventLog.value.find(item => item.file.filePath == operation.file.filePath && item.operationType == operation.operationType);
  if (alreadyProcessed != null) {
    return;
  }
  eventLog.value.push(operation);

  if (updatingFiles) return;
  if (operation.file.isDirectory) {
    if (operation.operationType == 'create') {
      discoveredFolders.value[operation.file.filePath] = operation.file;
    }
    else if (operation.operationType == 'delete') {
      delete discoveredFolders.value[operation.file.filePath];
    }
    else if (operation.operationType == 'update') {
      discoveredFolders.value[operation.file.filePath] = operation.file;
    }
  }
  else {
    if (operation.operationType == 'create') {
      discoveredFiles.value[operation.file.filePath] = operation.file;
      await listFiles(currentPath.value);
    }
    else if (operation.operationType == 'delete') {
      delete discoveredFiles.value[operation.file.filePath];
      delete files.value[operation.file.filePath];
    }
    else if (operation.operationType == 'update') {
      discoveredFiles.value[operation.file.filePath] = operation.file;
      await listFiles(currentPath.value);
    }
  }
});

</script>
  
<style>

</style>