using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.Xna.Framework;
using Microsoft.Xna.Framework.Audio;
using Microsoft.Xna.Framework.Content;
using Microsoft.Xna.Framework.GamerServices;
using Microsoft.Xna.Framework.Graphics;
using Microsoft.Xna.Framework.Input;
using Microsoft.Xna.Framework.Media;


namespace Rimbo_2D
{
    /// <summary>
    /// This is a game component that implements IUpdateable.
    /// </summary>
    public class AnimatedGameObject : Microsoft.Xna.Framework.DrawableGameComponent
    {
        private Game1 _game;
        
        public int frame;
        public Rectangle drawRectangle;
        private Texture2D _texture;
        private String _image;
        public Vector2 vector;
        public Vector2 origin;
        private float _Xpos;
        private float _Ypos;

        public int spriteWidth;
        protected int spriteHeight;
        protected int _location;

        public int animationTimer;
        private int animationTimerMemory;

        public float spriteRotation;
        public SpriteEffects spriteMirror;

        public float layerDepth;

        public AnimatedGameObject(Game1 game, String Image, float X, float Y, int spritewidth, int spriteheight)
            : base(game)
        {
            _game = game;
            _image = Image;
            _Xpos = X;
            _Ypos = Y;
            spriteWidth = spritewidth;
            spriteHeight = spriteheight;
        }

        /// <summary>
        /// Allows the game component to perform any initialization it needs to before starting
        /// to run.  This is where it can query for any required services and load content.
        /// </summary>
        public override void Initialize()
        {
            vector = new Vector2(_Xpos, _Ypos);
            origin = new Vector2(0, 0);

            frame = 0;
            spriteMirror = SpriteEffects.None;
            layerDepth = 0;
            
            animationTimer = (60 / _game.FPS);
            animationTimerMemory = animationTimer;

            base.Initialize();
        }

        protected override void LoadContent()
        {
            _texture = _game.Content.Load<Texture2D>(_image);
            base.LoadContent();
        }
        
        /// <summary>
        /// Allows the game component to update itself.
        /// </summary>
        /// <param name="gameTime">Provides a snapshot of timing values.</param>
        public override void Update(GameTime gameTime)
        {
            //This code is responsible for timing the animations,
            //additionally, it determines which section of the spritesheet is drawn based on the current frame.
            animationTimer--;
            if (animationTimer < 0)
            {
                animationTimer = animationTimerMemory;
            }

            //This location marks the starting X on the spritesheet
            _location = spriteWidth * frame;

            //The rectangle drawn starts from the frame's starting X, a Y of 0, and 
            drawRectangle = new Rectangle(_location, 0, spriteWidth, spriteHeight);

            base.Update(gameTime);
        }

        public override void Draw(GameTime gameTime)
        {
            SpriteBatch spriteBatch = _game.Services.GetService(typeof(SpriteBatch)) as SpriteBatch;
            spriteBatch.Begin();
            spriteBatch.Draw(_texture, vector, drawRectangle, Color.White, spriteRotation, origin, 1, spriteMirror, layerDepth);
            spriteBatch.End();
            base.Draw(gameTime);
        }
    }
}
