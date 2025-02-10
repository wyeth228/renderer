/**
 * v0.1.2
 */

define(["utils/requests", "utils/string"], function (
  utilsRequests,
  utilsString
) {
  var config = {
    MAIN_PAGE_NAME: "main",

    PAGES_DIRECTORY: "./pages",
    COMPONENTS_DIRECTORY: "./components",

    COMPONENTS_REGEXP: /<= component\(["].*?["]\) =>/gm,
    COMPONENT_NAME_REGEXP: /["'].*?["']/gm,
    QUOTATION_MARKS_REGEXP: /["']/gm,
  };

  var appRoot = undefined;

  var router = undefined;

  var onPageRenderHappen = undefined;

  var eventBus = undefined;

  function loadAndInitJSModule(type, name, onModuleLoad) {
    var pathStart = "pages/";

    if (type === "component") {
      pathStart = "components/";
    }

    requirejs([pathStart + name + "/" + name + ".js"], function (module) {
      if (module) {
        if ("init" in module) {
          module.init(eventBus);
        }
      }

      if (onModuleLoad) {
        onModuleLoad();
      }
    });
  }

  function isContainsComponents(pageContent) {
    /**
     * search in html content substrings like <= component("componentName") =>
     */
    var components = pageContent.match(config.COMPONENTS_REGEXP);

    if (components) {
      return true;
    }

    return false;
  }

  function insertComponentHTMLToContent(
    componentContent,
    componentReplaceName,
    pageContent
  ) {
    pageContent = utilsString.unescapeHTML(pageContent);

    while (pageContent.indexOf(componentReplaceName) > 0) {
      pageContent = pageContent.replace(componentReplaceName, componentContent);
    }

    return pageContent;
  }

  function onComponentHTMLLoad(
    componentName,
    componentReplaceName,
    componentContent
  ) {
    appRoot.innerHTML = insertComponentHTMLToContent(
      componentContent,
      componentReplaceName,
      appRoot.innerHTML
    );

    router.updatePageLinks();

    loadAndInitJSModule("component", componentName);

    if (isContainsComponents(componentContent)) {
      generateComponentsTree(componentContent);
    }
  }

  /**
   * @param {Array} parent
   * @param {string} htmlContent
   * @returns undefined
   */
  function generateComponentsTree(htmlContent) {
    var componentMatches = htmlContent.match(config.COMPONENTS_REGEXP);

    for (var i = 0; i < componentMatches.length; ++i) {
      var componentMatch = componentMatches[i];

      /**
       * extract from string <= component("componentName") => the "componentName" substring
       */
      var componentName = componentMatch.match(config.COMPONENT_NAME_REGEXP);

      if (!componentName) {
        return;
      }

      /**
       * remove "' symbols from "componentName" string
       */
      componentName = componentName[0].replace(
        config.QUOTATION_MARKS_REGEXP,
        ""
      );

      /**
       * load component html
       */
      (function (cName, cMatch) {
        utilsRequests.loadFile(
          getPathToComponent(cName),
          function (componentContent) {
            onComponentHTMLLoad(cName, cMatch, componentContent);
          }
        );
      })(componentName, componentMatch);
    }
  }

  function initializeAllComponents(pageContent) {
    generateComponentsTree(pageContent);
  }

  function insertHTMLToAppRoot(pageName, pageContent) {
    appRoot.innerHTML = pageContent;

    if (onPageRenderHappen) {
      onPageRenderHappen(pageName);
    }

    loadAndInitJSModule("page", pageName);

    router.updatePageLinks();
  }

  function getPathToPage(pageName) {
    /**
     * returns something like: ./pagesDirectory/pageName/pageName.html
     */
    return config.PAGES_DIRECTORY + "/" + pageName + "/" + pageName + ".html";
  }

  function getPathToComponent(componentName) {
    /**
     * returns something like: ./componentsDirectory/componentName/componentName.html
     */
    return (
      config.COMPONENTS_DIRECTORY +
      "/" +
      componentName +
      "/" +
      componentName +
      ".html"
    );
  }

  function loadPage(pageName) {
    utilsRequests.loadFile(getPathToPage(pageName), function (pageContent) {
      renderPage(pageName, pageContent);
    });
  }

  function renderPage(pageName, pageContent) {
    insertHTMLToAppRoot(pageName, pageContent);

    if (isContainsComponents(pageContent)) {
      initializeAllComponents(pageContent);
    }
  }

  return {
    navigate: function (path) {
      router.navigate(path);
    },

    onPageRender: function (callback) {
      onPageRenderHappen = callback;
    },

    init: function (eventBusDependency, rootId, routes) {
      eventBus = eventBusDependency;

      appRoot = document.getElementById(rootId);

      router = new Navigo();

      for (var i = 0; i < routes.length; ++i) {
        var route = routes[i];

        router.on(route, function (route) {
          if (route.url === "/" || route.url === "") {
            loadPage(config.MAIN_PAGE_NAME);
          } else {
            loadPage(route.url);
          }
        });
      }

      router.resolve();
    },
  };
});
