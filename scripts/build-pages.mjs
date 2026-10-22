import { existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DELIVERY_FEE_CENTS,
  FREE_DELIVERY_THRESHOLD_CENTS,
  publicMenu,
} from '../server/menu.js';

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = path.join(projectDir, 'dist-pages');

if (!existsSync(path.join(outputDir, 'index.html'))) {
  throw new Error('Build the Pages frontend into dist-pages before generating its menu.');
}

const menu = {
  items: publicMenu().map((item) => ({
    ...item,
    image: item.image.replace(/^\/+/, ''),
  })),
  deliveryFee: DELIVERY_FEE_CENTS / 100,
  freeDeliveryThreshold: FREE_DELIVERY_THRESHOLD_CENTS / 100,
};

writeFileSync(path.join(outputDir, 'demo-menu.json'), `${JSON.stringify(menu, null, 2)}\n`);
writeFileSync(path.join(outputDir, '.nojekyll'), '');
console.log(`Prepared ${menu.items.length} pizzas for the static GitHub Pages demo.`);
