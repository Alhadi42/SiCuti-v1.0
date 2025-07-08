/**
 * Application health checker
 */

export class HealthChecker {
  static async checkDatabaseConnection() {
    try {
      const { supabase } = await import('@/lib/supabaseOptimized');
      const { data, error } = await supabase
        .from('employees')
        .select('count')
        .limit(1);
      
      if (error) {
        throw error;
      }
      
      return {
        status: 'healthy',
        message: 'Database connection successful'
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `Database connection failed: ${error.message}`
      };
    }
  }

  static checkBrowserCompatibility() {
    const issues = [];
    
    // Check for required browser features
    if (!window.fetch) {
      issues.push('Fetch API not supported');
    }
    
    if (!window.localStorage) {
      issues.push('LocalStorage not supported');
    }
    
    if (!window.performance) {
      issues.push('Performance API not supported');
    }
    
    // Check for modern JavaScript features
    if (!window.Promise) {
      issues.push('Promises not supported');
    }
    
    if (!window.Array.prototype.find) {
      issues.push('Array.find not supported');
    }
    
    return {
      status: issues.length === 0 ? 'compatible' : 'incompatible',
      issues
    };
  }

  static checkPerformance() {
    const metrics = {};
    
    // Check page load time
    if (window.performance && window.performance.timing) {
      const timing = window.performance.timing;
      metrics.pageLoadTime = timing.loadEventEnd - timing.navigationStart;
      metrics.domContentLoaded = timing.domContentLoadedEventEnd - timing.navigationStart;
    }
    
    // Check memory usage (if available)
    if (window.performance && window.performance.memory) {
      metrics.memoryUsage = window.performance.memory.usedJSHeapSize;
      metrics.memoryLimit = window.performance.memory.jsHeapSizeLimit;
    }
    
    // Check network connectivity
    if (navigator.onLine !== undefined) {
      metrics.online = navigator.onLine;
    }
    
    return metrics;
  }

  static async runFullHealthCheck() {
    const results = {
      timestamp: new Date().toISOString(),
      database: await this.checkDatabaseConnection(),
      browser: this.checkBrowserCompatibility(),
      performance: this.checkPerformance(),
      environment: {
        isDev: import.meta.env.DEV,
        isProd: import.meta.env.PROD,
        version: import.meta.env.VITE_APP_VERSION || '1.0.0'
      }
    };
    
    // Log results in development
    if (import.meta.env.DEV) {
      console.group('🏥 Application Health Check');
      console.log('Results:', results);
      console.groupEnd();
    }
    
    return results;
  }

  static isHealthy(healthResults) {
    return (
      healthResults.database.status === 'healthy' &&
      healthResults.browser.status === 'compatible'
    );
  }
}

// Run health check on app startup
if (import.meta.env.DEV) {
  setTimeout(() => {
    HealthChecker.runFullHealthCheck();
  }, 2000);
} 