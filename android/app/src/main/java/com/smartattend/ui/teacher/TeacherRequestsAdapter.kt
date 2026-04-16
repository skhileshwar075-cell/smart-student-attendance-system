package com.smartattend.ui.teacher

import android.graphics.Color
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.button.MaterialButton
import com.smartattend.R
import com.smartattend.domain.model.AttendanceRequest

class TeacherRequestsAdapter(
    private val onApprove: (AttendanceRequest) -> Unit,
    private val onReject: (AttendanceRequest) -> Unit
) : ListAdapter<AttendanceRequest, TeacherRequestsAdapter.VH>(DIFF) {

    class VH(view: View) : RecyclerView.ViewHolder(view) {
        val tvStudentName: TextView = view.findViewById(R.id.tvStudentName)
        val tvSubject: TextView = view.findViewById(R.id.tvSubject)
        val tvDate: TextView = view.findViewById(R.id.tvDate)
        val tvReason: TextView = view.findViewById(R.id.tvReason)
        val tvStatus: TextView = view.findViewById(R.id.tvStatus)
        val btnApprove: MaterialButton = view.findViewById(R.id.btnApprove)
        val btnReject: MaterialButton = view.findViewById(R.id.btnReject)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH =
        VH(LayoutInflater.from(parent.context).inflate(R.layout.item_teacher_request, parent, false))

    override fun onBindViewHolder(holder: VH, position: Int) {
        val item = getItem(position)
        holder.tvStudentName.text = item.studentName ?: "Unknown Student"
        holder.tvSubject.text = item.subjectName ?: "—"
        holder.tvDate.text = item.date
        holder.tvReason.text = item.reason
        holder.tvStatus.text = item.status.replaceFirstChar { it.uppercase() }

        val (bgColor, textColor) = when (item.status.lowercase()) {
            "approved" -> "#DCFCE7" to "#166534"
            "rejected" -> "#FEE2E2" to "#991B1B"
            else       -> "#FEF3C7" to "#92400E"
        }
        holder.tvStatus.setBackgroundColor(Color.parseColor(bgColor))
        holder.tvStatus.setTextColor(Color.parseColor(textColor))

        val isPending = item.status.lowercase() == "pending"
        holder.btnApprove.visibility = if (isPending) View.VISIBLE else View.GONE
        holder.btnReject.visibility = if (isPending) View.VISIBLE else View.GONE

        holder.btnApprove.setOnClickListener { onApprove(item) }
        holder.btnReject.setOnClickListener { onReject(item) }
    }

    companion object {
        private val DIFF = object : DiffUtil.ItemCallback<AttendanceRequest>() {
            override fun areItemsTheSame(a: AttendanceRequest, b: AttendanceRequest) = a.id == b.id
            override fun areContentsTheSame(a: AttendanceRequest, b: AttendanceRequest) = a == b
        }
    }
}
