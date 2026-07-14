import { getMapillaryAccessToken } from './mapillary-api';

let activeViewer: { remove: () => void } | null = null;
let cssLoaded = false;

async function ensureMapillaryCss(): Promise<void> {
  if (cssLoaded) return;
  await import('mapillary-js/dist/mapillary.css');
  cssLoaded = true;
}

export async function mountMapillaryViewer(
  containerId: string,
  imageId: string,
  onReady?: () => void,
): Promise<void> {
  const token = getMapillaryAccessToken();
  if (!token) throw new Error('Mapillary token not configured');

  destroyMapillaryViewer();
  await ensureMapillaryCss();

  const el = document.getElementById(containerId);
  if (!el) throw new Error(`Missing #${containerId}`);

  el.innerHTML = '';
  el.classList.add('mapillary-pano-host');

  const { Viewer } = await import('mapillary-js');
  const viewer = new Viewer({
    accessToken: token,
    container: el,
    imageId,
    component: {
      cover: false,
      direction: true,
      sequence: false,
    },
  });

  if (onReady) {
    let ready = false;
    const finish = () => {
      if (ready) return;
      ready = true;
      onReady();
    };
    viewer.on('image', finish);
    viewer.on('load', finish);
  }

  activeViewer = viewer;
}

export function destroyMapillaryViewer(): void {
  if (activeViewer) {
    try {
      activeViewer.remove();
    } catch {
      /* ignore */
    }
    activeViewer = null;
  }
  document.querySelectorAll('.mapillary-pano-host').forEach((el) => {
    el.classList.remove('mapillary-pano-host');
    el.innerHTML = '';
  });
}

export function isMapillaryViewerActive(): boolean {
  return activeViewer != null;
}
