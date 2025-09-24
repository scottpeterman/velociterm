import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';

const WebGLContext = createContext(null);

export const useWebGL = () => {
  const context = useContext(WebGLContext);
  if (!context) {
    console.warn('useWebGL must be used within WebGLProvider');
  }
  return context;
};

export const WebGLProvider = ({ children }) => {
  const [webGLSupported, setWebGLSupported] = useState(false);
  const [webGLContext, setWebGLContext] = useState(null);

  const contextAttributes = useMemo(() => ({
    alpha: false,
    antialias: true,
    depth: true,
    stencil: false,
    preserveDrawingBuffer: false,
    powerPreference: 'high-performance',
    failIfMajorPerformanceCaveat: false,
    premultipliedAlpha: false,
    desynchronized: true
  }), []);

  useEffect(() => {
    const initWebGL = () => {
      const testCanvas = document.createElement('canvas');
      testCanvas.width = 1;
      testCanvas.height = 1;

      let gl = null;
      let webgl2 = false;

      try {
        gl = testCanvas.getContext('webgl2', contextAttributes);
        if (gl) {
          webgl2 = true;
          console.log('WebGL 2.0 enabled');
        } else {
          gl = testCanvas.getContext('webgl', contextAttributes) || 
               testCanvas.getContext('experimental-webgl', contextAttributes);
          if (gl) {
            console.log('WebGL 1.0 enabled');
          }
        }
      } catch (e) {
        console.warn('WebGL initialization failed:', e);
      }

      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
          const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
          console.log(`GPU: ${vendor} ${renderer}`);
        }

        const extensions = [
          'OES_texture_float',
          'OES_texture_float_linear',
          'WEBGL_lose_context',
          'ANGLE_instanced_arrays'
        ];

        const supportedExtensions = {};
        extensions.forEach(ext => {
          const extension = gl.getExtension(ext);
          if (extension) {
            supportedExtensions[ext] = extension;
            console.log(`Extension enabled: ${ext}`);
          }
        });

        setWebGLContext({
          gl,
          canvas: testCanvas,
          webgl2,
          extensions: supportedExtensions,
          contextAttributes
        });
        setWebGLSupported(true);
      } else {
        console.warn('WebGL not supported, falling back to 2D canvas');
        setWebGLSupported(false);
      }

      testCanvas.remove();
    };

    initWebGL();
  }, [contextAttributes]);

  const contextValue = useMemo(() => ({
    supported: webGLSupported,
    context: webGLContext,
    
    createOptimizedCanvas: (width, height, useWebGL = true) => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      if (useWebGL && webGLSupported) {
        const gl = canvas.getContext('webgl2', contextAttributes) || 
                   canvas.getContext('webgl', contextAttributes);
        return { canvas, context: gl, type: 'webgl' };
      } else {
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        return { canvas, context: ctx, type: '2d' };
      }
    },
    
    hasExtension: (extensionName) => {
      return webGLContext?.extensions?.[extensionName] !== undefined;
    },
    
    getPerformanceInfo: () => {
      if (!webGLContext?.gl) return null;
      
      const gl = webGLContext.gl;
      return {
        vendor: gl.getParameter(gl.VENDOR),
        renderer: gl.getParameter(gl.RENDERER),
        version: gl.getParameter(gl.VERSION),
        maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
        maxViewportDims: gl.getParameter(gl.MAX_VIEWPORT_DIMS),
        maxVertexAttribs: gl.getParameter(gl.MAX_VERTEX_ATTRIBS),
        webgl2: webGLContext.webgl2
      };
    },
    
    enableHardwareAcceleration: (element) => {
      if (element && webGLSupported) {
        element.style.willChange = 'transform';
        element.style.transform = 'translateZ(0)';
        element.style.backfaceVisibility = 'hidden';
      }
    }
  }), [webGLSupported, webGLContext, contextAttributes]);

  return (
    <WebGLContext.Provider value={contextValue}>
      {children}
    </WebGLContext.Provider>
  );
};