using UnityEngine;
using System.Collections;

public class MainCameraScript : MonoBehaviour
{

    public float distanceAway;
    public float targetDistanceAway;
    public float distanceUp;
    public float Smooth;
    public Transform followTransform;

    private Vector3 lookDir;
    private Vector3 targetPosition;
    private Vector3 velocityCamSmooth = Vector3.zero;
    private float camSmoothDampTime = 0.1f;
    private cameraStates camState = cameraStates.behind;
    public enum cameraStates
    {
        behind,
        firstPerson,
        target,
        targetLocked
    }

    public cameraStates cameraState
    {
        get { return this.camState; }
    }


	// Use this for initialization
	void Start ()
    {
        followTransform = GameObject.FindWithTag("Player").transform;
	}
	
	// Update is called once per frame
	void Update ()
    {
        if (Input.GetButton("Fire3")) camState = cameraStates.target;
        else camState = cameraStates.behind;
	}

    void FixedUpdate()
    {
        //A more Accurate name would be 'follow', as this camera loosely follows the player around.
        if (camState == cameraStates.behind)
        {
            //calculates an offset between the character's position and the camera.
            Vector3 characterOffset = followTransform.position + new Vector3(0f, distanceUp, 0f);

            //Calculates the diffirence between the current position and the player's position.
            lookDir = characterOffset - transform.position;
            //Prevent the Camera from Rolling.
            lookDir.y = 0;

            //Normalise the direction.
            lookDir.Normalize();

            //Readjusts the position.
            targetPosition = characterOffset + followTransform.up * distanceUp - lookDir * distanceAway;
        }
        //target happens when the player holds down Fire3. It centers the camera behind the player.
        else if (camState == cameraStates.target)
        {
            //Locks the Camera at the Player's backside and simply follows their position with the Camera offset.
            targetPosition = followTransform.position + followTransform.up * distanceUp - followTransform.forward * targetDistanceAway;
        }


        //Smoothly sends the camera to it's new position.
        SmoothPosition(transform.position, targetPosition);

        //Look at the Player.
        transform.LookAt(followTransform);
    }

    private void SmoothPosition(Vector3 fromPos, Vector3 toPos)
    {
        transform.position = Vector3.SmoothDamp(fromPos, toPos, ref velocityCamSmooth, camSmoothDampTime);
    }
}
