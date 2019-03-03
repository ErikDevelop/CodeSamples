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

/*
 * This class extends the AnimatedGameObject, which is essential for understanding the logic.
 */
namespace Rimbo_2D
{
    /// <summary>
    /// This is a game component that implements IUpdateable.
    /// </summary>
    public class Player : AnimatedGameObject
    {
        private Game1 _game;
        private PlayGame _playgame;
        private int _Xvelocity;
        private int _Yvelocity;
        private List<ground> map;
        public Boolean jumping;
        public Boolean kicking;
        private Boolean right;
        
        public Rectangle hitbox;
        public arm playerArm;

        private float returnvalue;

        public Player(Game1 game, PlayGame playgame, float X, float Y)
            : base(game, "Rimbosheet", X, Y, 72, 72)
        {
            _game = game;
            _playgame = playgame;
        }

        /// <summary>
        /// Allows the game component to perform any initialization it needs to before starting
        /// to run.  This is where it can query for any required services and load content.
        /// </summary>
        public override void Initialize()
        {
            this.frame = 0;
            _Xvelocity = 0;
            _Yvelocity = 0;
            jumping = true;
            kicking = false;

            playerArm = new arm(_game, _playgame, "armsheet", vector.X, vector.Y);

            base.Initialize();
        }

        /// <summary>
        /// Allows the game component to update itself.
        /// </summary>
        /// <param name="gameTime">Provides a snapshot of timing values.</param>
        public override void Update(GameTime gameTime)
        {
            //First, it runs the draw logic and the timer logic of the AnimatedGameObject class (see AnimatedGameObject.cs)
            base.Update(gameTime);

            //on every update, it draws a new hitbox, as it extends a bit in front of the character to determine future collision.
            hitbox = new Rectangle(((int)(this.vector.X +((this.spriteWidth / 2) - 15)) + _Xvelocity), ((int)this.vector.Y + _Yvelocity), 30, this.spriteHeight);

            //it also gets a list of all the ground objects Rimbo can land on. This includes destructible objects he can land on.
            //This needs to happen every update, as the state of these destructible objects can change.
            map = new List<ground>(_game.Components.OfType<ground>());

            //Adjusting the basic movement based on the character's velocity, as well as locking him to the screen.
            this.vector.X += _Xvelocity;
            this.vector.Y += _Yvelocity;
            this.vector.X = MathHelper.Clamp(this.vector.X, 0, (_game.GraphicsDevice.Viewport.Width - 72));
            this.vector.Y = MathHelper.Clamp(this.vector.Y, 0, (_game.GraphicsDevice.Viewport.Height));

            //Gravity. Rimbo can fall no faster than 15 pixels per frame, but speeds up until he does.
            if (_Yvelocity < 15) _Yvelocity++;
            else _Yvelocity = 15;

            //All ground or obstacle objects are checked, to adjust Rimbo's velocity as required; he hits something, he stops.
            foreach (ground Q in map)
            {
                if (this.hitbox.Intersects(Q.wallboxleft))
                {
                    _Xvelocity = 0;
                    this.vector.X = (Q.vector.X - 50);
                }

                if (this.hitbox.Intersects(Q.wallboxright))
                {
                    _Xvelocity = 0;
                    this.vector.X = (Q.vector.X + Q.spriteWidth) - 22;
                }
                
                if (this.hitbox.Intersects(Q.groundbox))
                {
                    jumping = false;
                    _Yvelocity = 0;
                    this.vector.Y = (Q.vector.Y - 72);
                }
            }

            //Determines how to draw the Sprite based on which way Rimbo is facing.
            if (right)
            {
                this.spriteMirror = SpriteEffects.None;
                playerArm.spriteMirror = SpriteEffects.None;

                playerArm.vector.Y = this.vector.Y + 25;
                playerArm.vector.X = this.vector.X + 27;
                playerArm.origin = new Vector2(5, 9);

                playerArm.spriteRotation = 0 + mousePosition();
            }
            else if (!right)
            {
                this.spriteMirror = SpriteEffects.FlipHorizontally;
                playerArm.spriteMirror = SpriteEffects.FlipHorizontally;

                playerArm.vector.Y = this.vector.Y + 25;
                playerArm.vector.X = this.vector.X + 42;
                playerArm.origin = new Vector2(57, 9);

                playerArm.spriteRotation = 0 - mousePosition();
            }
            
            //Input handling.
            KeyboardState keystate = Keyboard.GetState();

            if (keystate.IsKeyDown(Keys.Space) && !jumping || keystate.IsKeyDown(Keys.RightShift) && !jumping)
            {
                //Set Rimbo to his jumping animation, give him an upward velocity and lock controls by setting jumping to true.
                this.frame = 5;
                _Yvelocity = -15;
                jumping = true;
            }

            if (keystate.IsKeyDown(Keys.Right) || keystate.IsKeyDown(Keys.D))
            {
                //make Rimbo face right.
                right = true;

                //Speed Rimbo up until he hits a certain speed.
                if (_Xvelocity <= 3) _Xvelocity += 1;
                else _Xvelocity = 3;

                //move Rimbo's frame up every time the animation timer depletes.
                if (this.animationTimer == 0 && !jumping)
                {
                    this.frame++;
                    //unless he hit the ending of this animation, then return to the first frame.
                    if (this.frame > 4) frame = 1;
                }
            }
            else if (keystate.IsKeyDown(Keys.Left) || keystate.IsKeyDown(Keys.A))
            {
                //make rimbo face left, same as above.
                right = false;

                if (_Xvelocity >= -3) _Xvelocity -= 1;
                else _Xvelocity = -3;

                if (this.animationTimer == 0 && !jumping)
                {
                    this.frame++;
                    if (this.frame > 4) frame = 1;
                }
            }

            if (keystate.IsKeyDown(Keys.Down) || keystate.IsKeyDown(Keys.S))
            {
                //Display Rimbo's ducking animation.
                _Xvelocity = 0;
                this.frame = 6;

                //Adjust the arm object accoardingly.
                playerArm.vector.Y += 10;
                if (right) playerArm.vector.X += 5;
                else if (!right)playerArm.vector.X -= 5;
            }

            if (keystate.IsKeyDown(Keys.LeftControl) && !kicking || keystate.IsKeyDown(Keys.RightControl) && !kicking)
            {
                //make Rimbo kick
                kicking = true;
            }

            if (kicking)
            {
                //When kicking, Rimbo comes to a halt, 
                _Xvelocity = 0;
                
                if (this.animationTimer == 0)
                {
                    //Adjust his animation.
                    this.frame++;
                    if (this.frame < 7) this.frame = 7;
                    if (this.frame > 9)
                    {
                        //disable the kicking animation and go back to idle after the animation is finished.
                        kicking = false;
                        this.frame = 0;
                    }
                }
            }

            //The idle state.
            if (keystate.IsKeyUp(Keys.Space) && keystate.IsKeyUp(Keys.RightShift) && keystate.IsKeyUp(Keys.Right) && keystate.IsKeyUp(Keys.D) && keystate.IsKeyUp(Keys.Left) && keystate.IsKeyUp(Keys.A) && keystate.IsKeyUp(Keys.S) && keystate.IsKeyUp(Keys.Down) && keystate.IsKeyUp(Keys.RightControl) && keystate.IsKeyUp(Keys.LeftControl) && !kicking)
            {
                _Xvelocity = 0;
                this.frame = 0;
            }

            //This logic checks which item the player is currently holding.
            switch (_playgame.inventory.current)
            {
                case "none":
                {
                    if (playerArm is Pistol || playerArm is P90 || playerArm is G36C || playerArm is MINIMI || playerArm is L96)
                    {
                        if (_game.Components.Contains(playerArm)) _game.Components.Remove(playerArm);
                        //It then replaces the Arm with the arm of that type.
                        playerArm = new arm(_game, _playgame, "armsheet", vector.X, vector.Y);
                        _game.Components.Add(playerArm);
                    }
                    break;
                }
                case "pistol":
                {
                    if (!(playerArm is Pistol))
                    {
                        if (_game.Components.Contains(playerArm)) _game.Components.Remove(playerArm);
                        playerArm = new Pistol(_game, _playgame, vector.X, vector.Y);
                        _game.Components.Add(playerArm);
                    }
                    break;
                }
                case "SMG":
                {
                    if (!(playerArm is P90))
                    {
                        if (_game.Components.Contains(playerArm)) _game.Components.Remove(playerArm);
                        playerArm = new P90(_game, _playgame, vector.X, vector.Y);
                        _game.Components.Add(playerArm);
                    }
                    break;
                }
                case "Rifle":
                {
                    if (!(playerArm is G36C))
                    {
                        if (_game.Components.Contains(playerArm)) _game.Components.Remove(playerArm);
                        playerArm = new G36C(_game, _playgame, vector.X, vector.Y);
                        _game.Components.Add(playerArm);
                    }
                    break;
                }
                case "Machine":
                {
                    if (!(playerArm is MINIMI))
                    {
                        if (_game.Components.Contains(playerArm)) _game.Components.Remove(playerArm);
                        playerArm = new MINIMI(_game, _playgame, vector.X, vector.Y);
                        _game.Components.Add(playerArm);
                    }
                    break;
                }
                case "Sniper":
                {
                    if (!(playerArm is L96))
                    {
                        if (_game.Components.Contains(playerArm)) _game.Components.Remove(playerArm);
                        playerArm = new L96(_game, _playgame, vector.X, vector.Y);
                        _game.Components.Add(playerArm);
                    }
                    break;
                }
            }
        }

        /*
         * This function divides the viewport in sections of 10,
         * and changes the angle depending on which 'section' or 'bar' the mouse is currently in.
         */
        private float mousePosition()
        {
            MouseState mousestate = Mouse.GetState();
            float sector = _game.GraphicsDevice.Viewport.Height / 10;

            if (mousestate.Y >= sector * 0 && mousestate.Y < sector * 1) returnvalue = (float)-0.8;
            else if (mousestate.Y > sector * 1 && mousestate.Y < sector * 2) returnvalue = (float)-0.6;
            else if (mousestate.Y > sector * 2 && mousestate.Y < sector * 3) returnvalue = (float)-0.4;
            else if (mousestate.Y > sector * 3 && mousestate.Y < sector * 4) returnvalue = (float)-0.2;
            else if (mousestate.Y > sector * 4 && mousestate.Y < sector * 5) returnvalue = 0;
            else if (mousestate.Y > sector * 5 && mousestate.Y < sector * 6) returnvalue = 0;
            else if (mousestate.Y > sector * 6 && mousestate.Y < sector * 7) returnvalue = (float)0.2;
            else if (mousestate.Y > sector * 7 && mousestate.Y < sector * 8) returnvalue = (float)0.4;
            else if (mousestate.Y > sector * 8 && mousestate.Y < sector * 9) returnvalue = (float)0.6;
            else if (mousestate.Y > sector * 9 && mousestate.Y < sector * 10) returnvalue = (float)0.8;

            return returnvalue;
        }
    }
}
