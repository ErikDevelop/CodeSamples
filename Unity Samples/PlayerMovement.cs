using UnityEngine;
using System.Collections;

public class PlayerMovement : MonoBehaviour
{
    public float moveSpeed = 10f;
    public float sneakMoveSpeed = 1f;
    public float turnSmoothing = 15f;
    public float cameraDistance = 5.0f;
    public float directionSpeed = 3.0f;
    public float targetingMoveSpeed = 5f;
    public Camera cam;
    public Rigidbody rb;

    private Animator anim;
    private float rotationDegreesPerSecond = 360f;
    private float h;
    private float v;
    private float scroll;
    private bool fire3;
    private int sneakSpeed = 2;
    private int targetingMoveDirection = 0;
    private Vector3 direction;
    private Quaternion lookRotation;

    void Awake()
    {
        anim = GetComponent<Animator>();
        rb = GetComponent<Rigidbody>();
        direction = transform.forward;
    }

    void Update()
    {
        h      = Input.GetAxis("Horizontal");
        v      = Input.GetAxis("Vertical");
        scroll = Input.GetAxis("Mouse ScrollWheel");
        fire3  = Input.GetButton("Fire3");

        //handles user input and sets the required animation booleans.
        if (Input.GetButton("Jump")) anim.SetBool("leaping", true);
        else anim.SetBool("leaping", false);

        //This function translated Input to World Space, as the movement of the Character is relative to the Camera. See Line 123
        StickToWorldspace(transform, cam.transform, ref direction, ref moveSpeed);

        if (IsInLocomotion()) anim.SetBool("moving", true);
        else anim.SetBool("moving", false);

        //Fire3 Enables a locked screen, which changes the Player Character's behavior. This appoints the right animations.
        if (fire3)
        {
            anim.SetBool("targeting", true);

            if (IsInLocomotion())
            {
                if (h > 0) targetingMoveDirection = 1;
                else if (h < 0) targetingMoveDirection = 3;
                else if (v > 0) targetingMoveDirection = 0;
                else if (v < 0) targetingMoveDirection = 2;

                anim.SetInteger("direction", targetingMoveDirection);
            }
        }
        //Otherwise they move normally.
        else
        {
            anim.SetBool("targeting", false);

            if (scroll > 0 && sneakSpeed < 2) sneakSpeed = 2;
            else if (scroll < 0 && sneakSpeed > 1) sneakSpeed = 1;

            anim.SetInteger("moveSpeed", sneakSpeed);

            if (IsInLocomotion())
            {
                lookRotation = Quaternion.LookRotation(direction);
                transform.rotation = Quaternion.RotateTowards(transform.rotation, lookRotation, Time.deltaTime * rotationDegreesPerSecond);

            }
        }
    }

    void FixedUpdate()
    {
        //Entering 'Targeting', or Locked Camera mode.
        if (fire3)
        {
            if (anim.GetCurrentAnimatorStateInfo(0).IsName("Player_Roll_Forward")) rb.velocity = transform.forward * (targetingMoveSpeed * 2);
            else if (anim.GetCurrentAnimatorStateInfo(0).IsName("Player_Target_Leap_Back")) rb.velocity = transform.forward * -(targetingMoveSpeed * 2);
            else if (anim.GetCurrentAnimatorStateInfo(0).IsName("Player_Target_Leap_Right")) rb.velocity = transform.right * (targetingMoveSpeed * 2);
            else if (anim.GetCurrentAnimatorStateInfo(0).IsName("Player_Target_Leap_Left")) rb.velocity = transform.right * -(targetingMoveSpeed * 2);
            else {
                if (IsInLocomotion())
                {
                    Vector3 movementDirection = (transform.forward * v) + (transform.right * h);
                    rb.velocity = movementDirection * targetingMoveSpeed;
                }
                else
                {
                    rb.velocity = new Vector3(0, 0, 0);
                }
            }
        }
        else
        {
            if (anim.GetCurrentAnimatorStateInfo(0).IsName("Player_Roll_Forward")) rb.velocity = transform.forward * (targetingMoveSpeed * 2);
            else {
                if (IsInLocomotion())
                {
                    if (sneakSpeed == 2) rb.velocity = transform.forward * moveSpeed;
                    else if (sneakSpeed == 1) rb.velocity = transform.forward * sneakMoveSpeed;
                }
                else
                {
                    rb.velocity = new Vector3(0, 0, 0);
                }
            }
        }

    }

    public void StickToWorldspace(Transform root, Transform camera, ref Vector3 directionOut, ref float speedOut)
    {
        Vector3 rootDirection = root.forward;
        Vector3 stickDirection = new Vector3(h, 0, v);

        // Get camera rotation
        Vector3 CameraDirection = camera.forward;
        CameraDirection.y = 0.0f; // kill Y


        // Convert joystick input in Worldspace coordinates
        Quaternion referentialShift = Quaternion.FromToRotation(Vector3.forward, Vector3.Normalize(CameraDirection));

        //The direction of the joystick relative to the direction of the camera.
        //Moving the joystick to the right or the left will put the Movedirection 90 degrees from the camera.
        Vector3 moveDirection = referentialShift * stickDirection;

        //The cross product of the move direction and the root direction determines wether the character is moving left or right.
        Vector3 axisSign = Vector3.Cross(moveDirection, rootDirection);

        /*
         * These Rays draw the variables involved in creating the new movement Direction.
        Debug.DrawRay(new Vector3(root.position.x, root.position.y + 2f, root.position.z), moveDirection, Color.green);
        Debug.DrawRay(new Vector3(root.position.x, root.position.y + 2f, root.position.z), rootDirection, Color.magenta);
        Debug.DrawRay(new Vector3(root.position.x, root.position.y + 2f, root.position.z), stickDirection, Color.blue);
        Debug.DrawRay(new Vector3(root.position.x, root.position.y + 2.5f, root.position.z), axisSign, Color.red);
        */ 

        directionOut = moveDirection;
    }

    public bool IsInLocomotion()
    {
        if (v != 0 || h != 0) return true;
        else return false;
    }
}
