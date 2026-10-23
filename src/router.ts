import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from './views/HomeView.vue'

// Hash history (/#/aufnahme) works on static hosts like GitHub Pages without server rewrites.
export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/aufnahme', name: 'record', component: () => import('./views/RecordView.vue') },
    { path: '/frei', name: 'free', component: () => import('./views/FreeSpeechView.vue') },
    { path: '/katalog', name: 'catalog', component: () => import('./views/CatalogView.vue') },
    { path: '/daten', name: 'data', component: () => import('./views/DataView.vue') },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})
