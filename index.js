document.addEventListener('DOMContentLoaded', () => {
    // Access the canvas element and its 2D rendering context for drawing
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    // Function to resize the canvas to the entire screen size
    function resizeCanvas() {
        canvas.width = window.innerWidth;  // Set width to the window width
        canvas.height = window.innerHeight;  // Set height to the window height
    }

    // Initial call to set the canvas size
    resizeCanvas();

    // Listen for resize events (when the window is resized) and adjust the canvas size
    window.addEventListener('resize', resizeCanvas);

    // Class to handle notification messages that will be displayed on the screen
    class Notification {
        constructor() {
            this.message = '';  // The message to display
            this.displayUntil = 0; // Timestamp until the message should remain visible
            this.isActive = false; // Flag to track whether a notification is active
        }

        // Show a notification with a message for a certain duration (default 2 seconds)
        show(message, duration = 2000) {
            this.message = message;
            this.displayUntil = Date.now() + duration; // Store when to hide the notification
            this.isActive = true; // Set notification to active
        }

        // Draw the notification on the canvas
        draw(ctx) {
            // If the current time is less than the time to hide the notification, show it
            if (Date.now() < this.displayUntil) {
                ctx.font = '20px Arial';  // Set font for the notification text
                const textMetrics = ctx.measureText(this.message); // Measure the text width
                const textWidth = textMetrics.width; // Width of the message text
                const boxPadding = 20; // Padding around the message box
                const boxWidth = textWidth + boxPadding * 2; // Total width of the box including padding
                const boxHeight = 60; // Fixed height for the box

                // Draw a semi-transparent black background for the notification box
                ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                ctx.fillRect(
                    canvas.width / 2 - boxWidth / 2,  // Center the box horizontally
                    canvas.height / 2 - boxHeight / 2,  // Center the box vertically
                    boxWidth, 
                    boxHeight
                );

                // Set the text color to white and align it in the center
                ctx.fillStyle = 'white';
                ctx.textAlign = 'center';
                // Draw the notification message inside the box
                ctx.fillText(
                    this.message, 
                    canvas.width / 2,  // Horizontal center of the canvas
                    canvas.height / 2 + 10 // Vertical center with a slight offset
                );
            } else {
                this.isActive = false;  // Mark notification as inactive when it's time to hide
            }
        }
    }

    // Class to represent each draggable image object in the game
    class ImageObject {
        constructor(src, x, y, category, game) {
            this.img = new Image();  // Create a new image object
            this.img.src = src;  // Set the source of the image
            this.x = x;  // X-coordinate of the object on the canvas
            this.y = y;  // Y-coordinate of the object on the canvas
            this.category = category;  // Category of the object (e.g., 'organic', 'battery', etc.)
            this.isDragging = false;  // Flag to track if the object is being dragged
            this.width = 50; // Placeholder width, can be adjusted based on the actual image size
            this.height = 50; // Placeholder height, can be adjusted based on the actual image size
            this.game = game;  // Reference to the game object to add new image objects
            this.img.onload = () => this.draw(ctx);  // Ensure the image is loaded before drawing
        }

        // Method to draw the image object on the canvas
        draw(ctx) {
            ctx.drawImage(this.img, this.x, this.y, this.width, this.height);
        }

        // Method to update the position of the image, making it fall unless being dragged
        update(notificationActive) {
            if (!this.isDragging && !notificationActive) {
                this.y += 0.5; // Speed of falling when not being dragged and no notification is active
            }
        }

        // Check if the mouse pointer is hovering over the image object
        isMouseOver(mouseX, mouseY) {
            return mouseX > this.x && mouseX < this.x + this.width &&
                   mouseY > this.y && mouseY < this.y + this.height;
        }

        // Method to break a 'fullVape' object into its components
        breakApart() {
            if (this.category === 'fullVape') {
                // Define the components of a full vape
                const components = [
                    { src: 'images/battery.png', category: 'battery' },
                    { src: 'images/vapecontainer.png', category: 'recyclable' },
                    { src: 'images/vapeliquid.png', category: 'liquid' },
                ];

                // Create new ImageObject instances for each component and scatter them around
                components.forEach(component => {
                    const newX = this.x + Math.random() * 100 - 50; // Scatter the components around the original position
                    const newY = this.y + Math.random() * 50 - 25;
                    this.game.addImageObject(new ImageObject(component.src, newX, newY, component.category, this.game));
                });
            }
        }
    }

    // Class to represent a bin where image objects can be disposed of
    class Bin {
        constructor(src, x, category, width) {
            this.img = new Image();  // Create a new bin image
            this.img.src = src;  // Set the source of the bin image
            this.x = x;  // X-coordinate of the bin on the canvas
            this.category = category;  // Category of the bin (e.g., 'organic', 'battery', etc.)
            this.width = width;  // Width of the bin, determined based on available space
            this.height = 130;  // Fixed height for the bin
            this.y = 0;  // Initial Y-position, will be set dynamically
            this.img.onload = () => this.draw(ctx);  // Ensure the image is loaded before drawing
        }

        // Set the bottom Y position of the bin (so it stays at the bottom of the screen)
        setBottomPosition(canvasHeight) {
            this.y = canvasHeight - this.height;
        }

        // Draw the bin on the canvas
        draw(ctx) {
            ctx.drawImage(this.img, this.x, this.y, this.width, this.height);
        }
    }

    // Main game class that handles the game logic
    class Game {
        constructor(canvas, ctx) {
            this.canvas = canvas;  // Reference to the canvas
            this.ctx = ctx;  // Reference to the canvas context
            this.imageObjects = [];  // Array to hold all image objects in the game
            this.bins = [  // Define the bins where items can be disposed of
                new Bin('images/generalbin.png', 0, 'organic', canvas.width / 4),
                new Bin('images/batterybin.png', canvas.width / 4, 'battery', canvas.width / 4),
                new Bin('images/recyclablebin.png', canvas.width / 2, 'recyclable', canvas.width / 4),
                new Bin('images/vapebin.png', 3 * canvas.width / 4, 'liquid', canvas.width / 4),
            ];
            this.mouseX = 0;  // Current mouse X-coordinate
            this.mouseY = 0;  // Current mouse Y-coordinate
            this.draggedObject = null;  // Keep track of the currently dragged object

            this.notification = new Notification();  // Notification instance to show messages

            this.initImageObjects();  // Initialize image objects dynamically
            this.init();  // Initialize game event listeners and logic
            this.updateBinPositions();  // Update the bin positions based on the canvas size
        }

        // Initialize image objects to be added to the game
        initImageObjects() {
            // List of image sources and their categories
            const items = [
                { src: 'images/apple.png', category: 'organic' },
                { src: 'images/orange.png', category: 'organic' },
                { src: 'images/battery.png', category: 'battery' },
                { src: 'images/batteryb.png', category: 'battery' },
                { src: 'images/vapecontainer.png', category: 'recyclable' },
                { src: 'images/vapecontainerb.png', category: 'recyclable' },
                { src: 'images/vapeliquid.png', category: 'liquid' },
                { src: 'images/vapeliquidb.png', category: 'liquid' },
                { src: 'images/fullvape.png', category: 'fullVape' },
            ];

            // Create an image object for each item, placed randomly on the screen
            items.forEach(item => {
                const x = Math.random() * (canvas.width - 100) + 50;  // Random x-position
                const y = Math.random() * 50;  // Random y-position near the top
                this.imageObjects.push(new ImageObject(item.src, x, y, item.category, this));
            });
        }

        // Add a new image object to the game
        addImageObject(imageObject) {
            this.imageObjects.push(imageObject);
        }

        // Update the bin positions based on the current canvas height
        updateBinPositions() {
            const canvasHeight = this.canvas.height;
            this.bins.forEach(bin => bin.setBottomPosition(canvasHeight));
        }

        // Initialize game event listeners (mouse events, window resize)
        init() {
            this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));  // Detect when mouse is pressed
            this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));  // Detect mouse movement
            this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));  // Detect when mouse is released
            window.addEventListener('resize', () => {  // Adjust canvas size and bins when the window is resized
                resizeCanvas();
                this.updateBinPositions();
            });
            this.gameLoop();  // Start the game loop for continuous rendering
        }

        // Mouse down event handler: start dragging an object
        onMouseDown(e) {
            this.mouseX = e.offsetX;
            this.mouseY = e.offsetY;
            // Look for the topmost image object under the mouse
            for (let i = this.imageObjects.length - 1; i >= 0; i--) {
                if (this.imageObjects[i].isMouseOver(this.mouseX, this.mouseY)) {
                    this.draggedObject = this.imageObjects[i];
                    this.draggedObject.isDragging = true;

                    // If it's a full vape, break it apart into components
                    if (this.draggedObject.category === 'fullVape') {
                        this.draggedObject.breakApart();
                        this.imageObjects.splice(i, 1); // Remove the full vape object
                    }

                    break;
                }
            }
        }

        // Mouse move event handler: update the position of the dragged object
        onMouseMove(e) {
            if (this.draggedObject) {
                this.mouseX = e.offsetX;
                this.mouseY = e.offsetY;
                this.draggedObject.x = this.mouseX - this.draggedObject.width / 2;
                this.draggedObject.y = this.mouseY - this.draggedObject.height / 2;
            }
        }

        // Mouse up event handler: drop the dragged object and check disposal
        onMouseUp() {
            if (this.draggedObject) {
                this.draggedObject.isDragging = false;  // Stop dragging the object
                this.checkDisposal(this.draggedObject);  // Check if the object was disposed of correctly
                this.draggedObject = null;  // Reset the dragged object
            }
        }

        // Check if the image object was disposed of in the correct bin
        checkDisposal(imageObject) {
            const binWidth = this.canvas.width / this.bins.length;
            const binIndex = Math.floor(imageObject.x / binWidth);  // Find which bin the object is closest to

            // Make sure the object is near the bottom of the canvas for proper disposal
            if (binIndex >= 0 && binIndex < this.bins.length) {
                const bin = this.bins[binIndex];
                const isWithinYBounds = imageObject.y + imageObject.height >= bin.y;

                // Check if the object was placed in the correct bin
                if (isWithinYBounds) {
                    if (imageObject.category === bin.category) {
                        this.notification.show(`Correctly disposed of ${imageObject.category}!`);
                    } else {
                        this.notification.show(
                            `${imageObject.category} should not be disposed in the ${bin.category} bin.`
                        );
                    }
                }
            } else {
                this.notification.show(`Item missed the bins. Try again.`);
            }
        }

        // Game loop for continuous rendering and updating
        gameLoop() {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); // Clear the canvas for the next frame

            // Update and draw all image objects
            this.imageObjects.forEach(imageObject => {
                imageObject.update(this.notification.isActive);  // Update position, fall speed, etc.
                imageObject.draw(this.ctx);  // Draw the object
            });

            // Draw all the bins
            this.bins.forEach(bin => bin.draw(this.ctx));

            // Draw any active notifications
            this.notification.draw(this.ctx);

            // Request the next frame of the game loop
            requestAnimationFrame(this.gameLoop.bind(this));
        }
    }

    // Create a new instance of the Game and start it
    const game = new Game(canvas, ctx);
});
