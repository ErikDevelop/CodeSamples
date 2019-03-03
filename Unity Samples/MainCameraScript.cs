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
        if (camState == cameraStates.behind)
        {
            Vector3 characterOffset = followTransform.position + new Vector3(0f, distanceUp, 0f);

            lookDir = characterOffset - transform.position;
            lookDir.y = 0;
            lookDir.Normalize();

            //targetPosition = followTransform.position + followTransform.up * distanceUp - followTransform.forward * distanceAway;
            targetPosition = characterOffset + followTransform.up * distanceUp - lookDir * distanceAway;

            //Slowly moves the camera torwards the targeted position over Time.
            //transform.position = Vector3.Lerp(transform.position, targetPosition, Time.deltaTime * Smooth);
            //SmoothPosition(transform.position, targetPosition);
        }
        else if (camState == cameraStates.target)
        {
            targetPosition = followTransform.position + followTransform.up * distanceUp - followTransform.forward * targetDistanceAway;
        }

        SmoothPosition(transform.position, targetPosition);
        transform.LookAt(followTransform);
    }

    private void SmoothPosition(Vector3 fromPos, Vector3 toPos)
    {
        transform.position = Vector3.SmoothDamp(fromPos, toPos, ref velocityCamSmooth, camSmoothDampTime);
    }
}
