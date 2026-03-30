const cohereAPI = "LVS2pCt7IkKQhbPpnwYa14aODimwYV812Zrgyejf";
    const youtubeAPI = "AIzaSyCcbOElbRtIyLakUcCd9TU-aKE0AHHGtoc";
    
    let currentMindmapData = null;
    let videosVisible = false;
    let currentVideoTopic = null;

    function setTopic(topic) {
      document.getElementById('topicInput').value = topic;
      generateMindMap();
    }

    async function generateMindMap() {
      const input = document.getElementById("topicInput").value.trim();
      if (!input) {
        alert("Please enter a topic to generate a mindmap");
        return;
      }

      showLoading(true);
      
      try {
        const baseTopic = input.toLowerCase()
          .replace(/mindmap of |mindmap on |create a mindmap for |make a mindmap on /gi, '')
          .trim();

        // Generate subtopics
        const subtopics = await generateSubtopics(baseTopic);
        
        currentMindmapData = { topic: baseTopic, subtopics };
        drawMindMap(baseTopic, subtopics);
        
        // Load videos for the main topic by default
        await loadVideos(baseTopic, 'main');
        
      } catch (error) {
        console.error('Error generating mindmap:', error);
        // Fallback to mock data if API fails
        const subtopics = getMockSubtopics(baseTopic);
        drawMindMap(baseTopic, subtopics);
        loadMockVideos(baseTopic, subtopics);
      } finally {
        showLoading(false);
      }
    }

    async function generateSubtopics(topic) {
      try {
        const response = await fetch("https://api.cohere.ai/v1/chat", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${cohereAPI}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "command-r",
            message: `Create a list of exactly 6 important subtopics for "${topic}". Format as a numbered list:\n1.\n2.\n3.\n4.\n5.\n6.`,
            max_tokens: 150,
            temperature: 0.7
          })
        });

        if (!response.ok) {
          throw new Error('Cohere API failed');
        }

        const data = await response.json();
        const text = data.text;
        
        // Parse the numbered list
        const subtopics = text.split(/\n/)
          .map(line => line.replace(/^\d+\.\s*/, '').trim())
          .filter(line => line.length > 0 && line.length < 50)
          .slice(0, 6);

        return subtopics.length >= 3 ? subtopics : getMockSubtopics(topic);
      } catch (error) {
        console.error('Cohere API error:', error);
        return getMockSubtopics(topic);
      }
    }

    function getMockSubtopics(topic) {
      const mockSubtopics = {
        'data structures': ['Arrays', 'Linked Lists', 'Stacks', 'Queues', 'Trees', 'Graphs'],
        'machine learning': ['Supervised Learning', 'Unsupervised Learning', 'Neural Networks', 'Deep Learning', 'Reinforcement Learning', 'Model Evaluation'],
        'web development': ['HTML/CSS', 'JavaScript', 'React', 'Node.js', 'Databases', 'APIs'],
        'digital marketing': ['SEO', 'Social Media', 'Content Marketing', 'Email Marketing', 'PPC Advertising', 'Analytics'],
        'psychology': ['Cognitive Psychology', 'Behavioral Psychology', 'Social Psychology', 'Developmental Psychology', 'Abnormal Psychology', 'Research Methods'],
        'javascript': ['Variables & Types', 'Functions', 'Objects & Arrays', 'DOM Manipulation', 'Async Programming', 'ES6+ Features'],
        'java': ['OOP Concepts', 'Data Types', 'Collections', 'Exception Handling', 'Multithreading', 'Spring Framework'],
        'python': ['Syntax Basics', 'Data Structures', 'OOP', 'Libraries', 'Web Frameworks', 'Data Science'],
        'react': ['Components', 'State & Props', 'Hooks', 'Routing', 'State Management', 'Testing']
      };

      const normalizedTopic = topic.toLowerCase();
      return mockSubtopics[normalizedTopic] || 
        ['Fundamentals', 'Core Concepts', 'Advanced Topics', 'Tools & Technologies', 'Best Practices', 'Applications'];
    }

    async function loadVideos(topic, type = 'subtopic') {
      try {
        const videoGrid = document.getElementById('videoGrid');
        videoGrid.innerHTML = '';
        
       document.getElementById('videoSectionTitle').textContent = 
        `📺 Videos for: ${type === 'subtopic' && currentMindmapData ? topic + ' in ' + currentMindmapData.topic : topic}`;

        currentVideoTopic = topic;

        showLoadingVideos(true);
        
        // Search for videos related to the topic
        const query = type === 'subtopic' && currentMindmapData 
        ? `${topic} in ${currentMindmapData.topic} tutorial` 
        : `${topic} tutorial`;

         const videos = await searchYouTubeVideos(query, 4);

        
        if (videos.length > 0) {
          videos.forEach(video => {
            const videoCard = createVideoCard(topic, video.id, video.title);
            videoGrid.appendChild(videoCard);
          });
        } else {
          // Show placeholder if no videos found
          const videoCard = document.createElement('div');
          videoCard.className = 'video-card';
          videoCard.innerHTML = `
            <h3>${topic}</h3>
            <div style="padding: 20px; text-align: center; color: #666; background: #f8f9fa;">
              <div style="font-size: 2em; margin-bottom: 10px;">🎥</div>
              <p>No videos found for this topic</p>
              <p style="font-size: 0.8em; margin-top: 10px; color: #999;">
                Try another topic or check your YouTube API key
              </p>
            </div>
          `;
          videoGrid.appendChild(videoCard);
        }
        
        // Show the video section
        document.getElementById('videoSection').style.display = 'block';
        videosVisible = true;

      } catch (error) {
        console.error('YouTube API error:', error);
        loadMockVideos(topic);
      } finally {
        showLoadingVideos(false);
      }
    }

    function showLoadingVideos(show) {
      const videoGrid = document.getElementById('videoGrid');
      if (show) {
        videoGrid.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 30px;">
            <div class="spinner"></div>
            <p>Loading videos...</p>
          </div>
        `;
      }
    }

    async function searchYouTubeVideos(query, maxResults = 4) {
      try {
        const response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=${maxResults}&q=${encodeURIComponent(query + ' tutorial')}&type=video&key=${youtubeAPI}`);
        
        if (!response.ok) {
          throw new Error('YouTube API failed');
        }

        const data = await response.json();
        
        return data.items?.map(item => ({
          id: item.id.videoId,
          title: item.snippet.title
        })) || [];
      } catch (error) {
        console.error('YouTube search error:', error);
        return [];
      }
    }

    function createVideoCard(topic, videoId, title) {
      const videoCard = document.createElement('div');
      videoCard.className = 'video-card';
      videoCard.innerHTML = `
        <h3>${topic}</h3>
        <iframe src="https://www.youtube.com/embed/${videoId}" 
                frameborder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowfullscreen
                title="${title}">
        </iframe>
        <div style="padding: 10px; font-size: 0.9em; color: #666;">
          ${title.length > 50 ? title.substring(0, 50) + '...' : title}
        </div>
      `;
      return videoCard;
    }

    function loadMockVideos(topic) {
      const videoGrid = document.getElementById('videoGrid');
      videoGrid.innerHTML = '';

      const mockVideoIds = [
        'dQw4w9WgXcQ', 'jNQXAC9IVRw', 'astISOttCQ0', 'QH2-TGUlwu4',
        'nfWlot6h_JM', 'H7X1H0veAMk', 'iik25wqIuFo', 'bHQqHjyLUIM'
      ];
      
      // Shuffle the array to get random videos
      const shuffled = mockVideoIds.sort(() => 0.5 - Math.random());
      const selectedVideos = shuffled.slice(0, 4);
      
      selectedVideos.forEach((videoId, index) => {
        const videoCard = document.createElement('div');
        videoCard.className = 'video-card';
        videoCard.innerHTML = `
          <h3>${topic}</h3>
          <div style="padding: 20px; text-align: center; color: #666; background: #f8f9fa;">
            <div style="font-size: 2em; margin-bottom: 10px;">🎥</div>
            <p><strong>Sample Video:</strong></p>
            <p style="font-size: 0.9em;">${topic} Tutorial</p>
            <p style="font-size: 0.8em; margin-top: 10px; color: #999;">
              Videos will load with valid YouTube API key
            </p>
          </div>
        `;
        videoGrid.appendChild(videoCard);
      });
    }

    function drawMindMap(topic, subtopics) {
      const mindmapDiv = document.getElementById("mindmap");
      mindmapDiv.innerHTML = '';

      // Ensure we have valid data
      if (!topic || !subtopics || subtopics.length === 0) {
        console.error('Invalid mindmap data');
        return;
      }

      const containerWidth = Math.min(800, window.innerWidth - 40);
      const containerHeight = 400;
      const width = containerWidth - 40;
      const height = containerHeight - 40;
      
      const svg = d3.select("#mindmap")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("class", "mindmap-svg");

      // Add gradient definitions
      const defs = svg.append("defs");
      
      const centralGradient = defs.append("linearGradient")
        .attr("id", "centralGradient")
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "100%")
        .attr("y2", "100%");
      
      centralGradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "#6366f1");
      
      centralGradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "#4f46e5");

      const subtopicGradient = defs.append("linearGradient")
        .attr("id", "subtopicGradient")
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "100%")
        .attr("y2", "100%");
      
      subtopicGradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "#10b981");
      
      subtopicGradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "#059669");

      // Tree layout parameters
      const rootX = 100;
      const rootY = height / 2;
      const branchStartX = 250;
      const verticalSpacing = Math.min(70, (height - 60) / subtopics.length);

      // Create tree structure data
      const treeData = {
        name: topic.charAt(0).toUpperCase() + topic.slice(1),
        x: rootX,
        y: rootY,
        children: subtopics.map((subtopic, i) => ({
          name: subtopic.replace(/^\d+\.\s*/, '').trim(),
          x: branchStartX,
          y: rootY - (subtopics.length - 1) * verticalSpacing / 2 + i * verticalSpacing,
          parent: { x: rootX, y: rootY }
        }))
      };

      // Draw connections first (so they appear behind nodes)
      treeData.children.forEach(child => {
        // Create curved path for more organic look
        const midX = (treeData.x + child.x) / 2;
        
        svg.append("path")
          .attr("class", "link")
          .attr("d", `M${treeData.x + 50},${treeData.y} 
                     C${midX},${treeData.y} 
                     ${midX},${child.y} 
                     ${child.x - 30},${child.y}`)
          .attr("fill", "none")
          .attr("stroke", "#6366f1")
          .attr("stroke-width", 2)
          .attr("opacity", 0.6);
      });

      // Draw root node (main topic)
      const rootNode = svg.append("g")
        .attr("class", "node central-node")
        .attr("transform", `translate(${treeData.x}, ${treeData.y})`);

      // Root node background
      rootNode.append("rect")
        .attr("x", -50)
        .attr("y", -25)
        .attr("width", 100)
        .attr("height", 50)
        .attr("rx", 25)
        .attr("ry", 25)
        .attr("fill", "url(#centralGradient)")
        .attr("stroke", "#4f46e5")
        .attr("stroke-width", 2)
        .attr("filter", "drop-shadow(2px 2px 5px rgba(0,0,0,0.15))")
        .on("click", () => loadVideos(topic, 'main'));

      // Root node text
      const rootText = rootNode.append("text")
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .style("fill", "white");

      const topicText = treeData.name;
      if (topicText.length > 15) {
        const words = topicText.split(' ');
        if (words.length > 1) {
          rootText.append("tspan")
            .attr("x", 0)
            .attr("dy", "-0.3em")
            .text(words[0]);
          rootText.append("tspan")
            .attr("x", 0)
            .attr("dy", "1.2em")
            .text(words.slice(1).join(' ').substring(0, 12) + (words.slice(1).join(' ').length > 12 ? '...' : ''));
        } else {
          rootText.text(topicText.substring(0, 15) + "...");
        }
      } else {
        rootText.text(topicText);
      }

      // Draw subtopic nodes
      treeData.children.forEach((child, i) => {
        const childNode = svg.append("g")
          .attr("class", "node subtopic-node")
          .attr("transform", `translate(${child.x}, ${child.y})`);

        // Calculate text width for dynamic box sizing
        const tempText = svg.append("text")
          .style("font-size", "13px")
          .style("font-weight", "600")
          .text(child.name)
          .style("opacity", 0);
        
        const textWidth = tempText.node().getBBox().width + 20;
        tempText.remove();

        // Subtopic node background (rounded rectangle)
        childNode.append("rect")
          .attr("x", -textWidth/2)
          .attr("y", -18)
          .attr("width", textWidth)
          .attr("height", 36)
          .attr("rx", 18)
          .attr("ry", 18)
          .attr("fill", "url(#subtopicGradient)")
          .attr("stroke", "#059669")
          .attr("stroke-width", 1.5)
          .attr("filter", "drop-shadow(1px 1px 3px rgba(0,0,0,0.1))")
          .style("cursor", "pointer")
          .on("click", () => loadVideos(child.name, 'subtopic'))
          .on("mouseover", function() {
            d3.select(this)
              .transition()
              .duration(150)
              .attr("transform", "scale(1.03)")
              .attr("filter", "drop-shadow(2px 2px 5px rgba(0,0,0,0.2))");
          })
          .on("mouseout", function() {
            d3.select(this)
              .transition()
              .duration(150)
              .attr("transform", "scale(1)")
              .attr("filter", "drop-shadow(1px 1px 3px rgba(0,0,0,0.1))");
          });

        // Subtopic node text
        const childText = childNode.append("text")
          .attr("text-anchor", "middle")
          .attr("dominant-baseline", "middle")
          .style("font-size", "13px")
          .style("font-weight", "600")
          .style("fill", "white")
          .style("pointer-events", "none");

        // Handle text wrapping for subtopic nodes
        const cleanSubtopic = child.name;
        if (cleanSubtopic.length > 20) {
          const words = cleanSubtopic.split(' ');
          if (words.length > 1) {
            childText.append("tspan")
              .attr("x", 0)
              .attr("dy", "-0.3em")
              .text(words[0]);
            childText.append("tspan")
              .attr("x", 0)
              .attr("dy", "1.2em")
              .text(words.slice(1).join(' ').substring(0, 15) + (words.slice(1).join(' ').length > 15 ? '...' : ''));
          } else {
            childText.text(cleanSubtopic.substring(0, 20) + "...");
          }
        } else {
          childText.text(cleanSubtopic);
        }

        // Add branch number
        svg.append("circle")
          .attr("cx", child.x - textWidth/2 - 12)
          .attr("cy", child.y)
          .attr("r", 8)
          .attr("fill", "#667eea")
          .attr("stroke", "white")
          .attr("stroke-width", 1.5);

        svg.append("text")
          .attr("x", child.x - textWidth/2 - 12)
          .attr("y", child.y)
          .attr("text-anchor", "middle")
          .attr("dominant-baseline", "middle")
          .style("font-size", "11px")
          .style("font-weight", "bold")
          .style("fill", "white")
          .text(i + 1);
      });

      // Show controls and hide empty state
      document.getElementById('controls').style.display = 'flex';
      document.getElementById('emptyState').style.display = 'none';
      
      console.log(`Tree mindmap created with topic: ${topic} and ${subtopics.length} subtopics`);
    }

    function showLoading(show) {
      const loading = document.getElementById('loading');
      const emptyState = document.getElementById('emptyState');
      const controls = document.getElementById('controls');
      
      if (show) {
        loading.style.display = 'block';
        emptyState.style.display = 'none';
        controls.style.display = 'none';
        document.getElementById('mindmap').innerHTML = '';
      } else {
        loading.style.display = 'none';
      }
    }

    function exportMindMap() {
      const mindmapElement = document.getElementById("mindmap");
      if (!mindmapElement.innerHTML) {
        alert("Please generate a mindmap first!");
        return;
      }

      html2canvas(mindmapElement, {
        backgroundColor: '#ffffff',
        scale: 2
      }).then(canvas => {
        const link = document.createElement("a");
        link.download = `mindmap-${Date.now()}.png`;
        link.href = canvas.toDataURL();
        link.click();
      });
    }

    function exportSVG() {
      const svg = document.querySelector("#mindmap svg");
      if (!svg) {
        alert("Please generate a mindmap first!");
        return;
      }

      const svgData = new XMLSerializer().serializeToString(svg);
      const svgBlob = new Blob([svgData], {type: "image/svg+xml;charset=utf-8"});
      const svgUrl = URL.createObjectURL(svgBlob);
      
      const link = document.createElement("a");
      link.href = svgUrl;
      link.download = `mindmap-${Date.now()}.svg`;
      link.click();
      
      URL.revokeObjectURL(svgUrl);
    }

    function toggleVideos() {
      const videoSection = document.getElementById('videoSection');
      videosVisible = !videosVisible;
      videoSection.style.display = videosVisible ? 'block' : 'none';
      
      // If showing videos and no topic is selected, load main topic videos
      if (videosVisible && !currentVideoTopic && currentMindmapData) {
        loadVideos(currentMindmapData.topic, 'main');
      }
    }

    // Allow Enter key to generate mindmap
    document.getElementById('topicInput').addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        generateMindMap();
      }
    });